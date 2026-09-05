package com.dice.security;

import com.dice.config.DiceProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Stateless JWT security.
 *
 * <p>The user store is in-memory and seeded with one account per {@link Role} —
 * enough for the demo, and the seam to replace when real identity arrives.
 * Swap {@link #userDetailsService} for a DB- or SSO-backed implementation and
 * nothing else here has to change.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
@Slf4j
public class SecurityConfig {

    /** Reachable without a token. Keep this list short and deliberate. */
    private static final String[] PUBLIC_PATHS = {
            "/api/auth/**",
            "/actuator/health",
            "/actuator/health/**",
            "/actuator/info",
            // Signature-verified in OdooWebhookController rather than by a bearer token.
            "/api/webhooks/**"
    };

    private final JwtService jwtService;
    private final DiceProperties properties;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Browsers send the CORS preflight without credentials.
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(PUBLIC_PATHS).permitAll()
                        .anyRequest().authenticated())
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) ->
                                response.sendError(HttpStatus.UNAUTHORIZED.value(), "Unauthorized"))
                        // Without this, an authenticated-but-forbidden request (e.g. a
                        // non-CUSTOMER hitting /api/portal/**) falls through to
                        // GlobalExceptionHandler's generic 500 instead of a clean 403 —
                        // found while verifying CustomerPortalController's role guard.
                        .accessDeniedHandler((request, response, accessDeniedException) ->
                                response.sendError(HttpStatus.FORBIDDEN.value(), "Forbidden")))
                .addFilterBefore(new JwtAuthenticationFilter(jwtService),
                        UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Demo accounts. Username is the lowercased role, password is
     * {@code dice-demo} for every one of them — see docs/demo-flow.md.
     */
    @Bean
    public UserDetailsService userDetailsService(PasswordEncoder encoder) {
        String password = encoder.encode("dice-demo");
        var users = java.util.Arrays.stream(Role.values())
                .map(role -> User.withUsername(role.name().toLowerCase())
                        .password(password)
                        .authorities(new SimpleGrantedAuthority(role.authority()))
                        .build())
                .toList();
        log.info("Seeded {} in-memory demo accounts (password: dice-demo)", users.size());
        return new InMemoryUserDetailsManager(users);
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(properties.cors().allowedOrigins());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    /**
     * Reads {@code Authorization: Bearer <token>} and populates the security
     * context. A missing or invalid token is not an error here — the request
     * simply stays anonymous and the authorization rules decide what happens.
     */
    @RequiredArgsConstructor
    static class JwtAuthenticationFilter extends OncePerRequestFilter {

        private static final String BEARER = "Bearer ";

        private final JwtService jwtService;

        @Override
        protected void doFilterInternal(HttpServletRequest request,
                                        HttpServletResponse response,
                                        FilterChain chain) throws ServletException, IOException {
            String header = request.getHeader(HttpHeaders.AUTHORIZATION);
            if (header != null && header.startsWith(BEARER)
                    && SecurityContextHolder.getContext().getAuthentication() == null) {
                String token = header.substring(BEARER.length()).trim();
                try {
                    Claims claims = jwtService.parse(token);
                    var authorities = jwtService.rolesOf(claims).stream()
                            .map(role -> new SimpleGrantedAuthority(role.authority()))
                            .toList();
                    var authentication = new UsernamePasswordAuthenticationToken(
                            claims.getSubject(), null, authorities);
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                } catch (JwtException | IllegalArgumentException e) {
                    // Expired or tampered token: stay anonymous, let authz reject it.
                    logger.debug("Rejected bearer token: " + e.getMessage());
                    SecurityContextHolder.clearContext();
                }
            }
            chain.doFilter(request, response);
        }
    }
}
