package com.crash.Raketka.dto;

import com.crash.Raketka.domain.Theme;

/**
 * {@code fragmentId} (0..3) — индекс фрагмента пазла из
 * {@code GameConfig.fragments}. Клиент больше не присылает {@code betAmount}
 * и значение бустера сам — пара (сумма ставки, бустер) целиком приходит с
 * сервера через {@code GET /api/config/public}, клиент лишь выбирает id.
 * Так клиент физически не может подделать комбинацию ставка/бустер.
 */
public record StartRoundRequest(Theme theme, int fragmentId) {
}
