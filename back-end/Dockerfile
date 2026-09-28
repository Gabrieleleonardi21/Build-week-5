# Render non ha un runtime Java 25 pronto: si costruisce l'immagine, cosi' la
# versione del JDK la decidiamo noi ed e' la stessa che gira sul portatile.

# --- Fase 1: compilazione -----------------------------------------------------
FROM eclipse-temurin:25-jdk AS build
WORKDIR /app

# Prima solo i file del wrapper e il pom: finche' le dipendenze non cambiano,
# Render riusa questo strato dalla cache e la build dura pochi secondi.
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B -ntp dependency:go-offline

COPY src/ src/
RUN ./mvnw -B -ntp -DskipTests package

# --- Fase 2: esecuzione -------------------------------------------------------
# Solo il JRE e il jar: l'immagine finale non si porta dietro Maven ne' i sorgenti.
FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

# 8080 e' il valore di riserva: in produzione la porta la impone Render con PORT.
EXPOSE 8080

# MaxRAMPercentage: il piano free ha 512 MB e la JVM, senza questo, ne prende
# un quarto e poi va in OOM quando arriva il traffico.
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/app.jar"]
