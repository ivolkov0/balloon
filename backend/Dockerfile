# Локальная машина: только Java 8 на PATH, а проекту нужен JDK 25 (pom.xml
# java.version=25) — поэтому собираем и запускаем в контейнере, без установки
# JDK на хост. См. docker-compose.yml.
FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn -q -DskipTests package

FROM eclipse-temurin:25-jre
WORKDIR /
COPY --from=build /app/target/Raketka-0.0.1-SNAPSHOT.jar /app.jar
COPY config.json /config.json
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app.jar"]
