package com.crash.Raketka.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Регистрирует X-Session-Token как security scheme в Swagger — на
 * /swagger-ui.html появляется кнопка Authorize, куда можно вставить токен из
 * POST /api/auth/guest и дальше дёргать закрытые ручки прямо из UI. Нужно для
 * "Технической проверяемости backend" (см. Критерии оценки, Раздел 4): без
 * этого экспертам пришлось бы руками собирать заголовок в curl/Postman.
 */
@Configuration
public class OpenApiConfig {

    private static final String SCHEME_NAME = "X-Session-Token";

    @Bean
    public OpenAPI raketkaOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Воздушный Шар API")
                        .description("Crash-игра с турнирной механикой — см. README.md в репозитории для полного описания модели.")
                        .version("v1"))
                .addSecurityItem(new SecurityRequirement().addList(SCHEME_NAME))
                .components(new Components().addSecuritySchemes(SCHEME_NAME,
                        new SecurityScheme()
                                .name("X-Session-Token")
                                .type(SecurityScheme.Type.APIKEY)
                                .in(SecurityScheme.In.HEADER)
                                .description("Токен из POST /api/auth/guest|register|login. Не нужен для /api/auth/** и /api/config/public.")));
    }
}
