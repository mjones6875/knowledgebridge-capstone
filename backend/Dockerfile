# Build stage: compiles the jar, needs Maven + JDK, not needed at runtime
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Copy only the pom first so Docker can cache the dependency download layer
# separately from source code, dependencies rarely change, source does.
COPY pom.xml .
RUN mvn dependency:go-offline -B

COPY src ./src
RUN mvn clean package -DskipTests -B

# Runtime stage: just the JRE and the built jar, much smaller than the build image
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
