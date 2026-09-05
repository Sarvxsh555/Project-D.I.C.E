# Build context is the repo root (see docker-compose.yml) so this stage can
# pull in ../database for Flyway migrations + seed scripts.
FROM eclipse-temurin:21-jdk AS build
WORKDIR /build
COPY backend/.mvn/ .mvn/
COPY backend/mvnw backend/pom.xml ./
RUN ./mvnw -q dependency:go-offline
COPY backend/src ./src
COPY database ./database
RUN ./mvnw -q -Ddice.database.dir=/build/database package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /build/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
