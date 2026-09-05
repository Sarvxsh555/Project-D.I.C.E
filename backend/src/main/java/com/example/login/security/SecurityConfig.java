package com.example.login.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final CsrfFilter csrfFilter;
    private final UnauthorizedEntryPoint unauthorizedEntryPoint;
    private final ForbiddenAccessDeniedHandler forbiddenAccessDeniedHandler;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter, CsrfFilter csrfFilter, UnauthorizedEntryPoint unauthorizedEntryPoint,
                           ForbiddenAccessDeniedHandler forbiddenAccessDeniedHandler) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.csrfFilter = csrfFilter;
        this.unauthorizedEntryPoint = unauthorizedEntryPoint;
        this.forbiddenAccessDeniedHandler = forbiddenAccessDeniedHandler;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(eh -> eh
                        .authenticationEntryPoint(unauthorizedEntryPoint)
                        .accessDeniedHandler(forbiddenAccessDeniedHandler))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**").permitAll()
                        // Read-only: other services (e.g. governance-engine) need to see configured
                        // discount ceilings on a caller's behalf without themselves being an admin.
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/admin/discount-rules")
                        .authenticated()
                        // A3 Discount & chain setup is shared: Admin owns the screen, Sales Manager
                        // configures the same ceilings and approval-chain mapping.
                        .requestMatchers("/api/admin/discount-rules/**")
                        .hasAnyRole("ADMIN", "SALES_MANAGER")
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .anyRequest().authenticated())
                .addFilterBefore(csrfFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    private CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:5173", "http://localhost:5175"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
