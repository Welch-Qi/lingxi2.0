package com.yuanshu.starter.core.web;

import java.util.List;

/**
 * 统一分页响应体（§4.3.1）：分页响应固定为 { list, total, pageNo, pageSize }。
 *
 * <p>分页参数：pageNo 从 1 起，pageSize 默认 20、最大 200。禁止跨页深翻（§3.3 D9）。
 */
public record PageResult<T>(List<T> list, long total, int pageNo, int pageSize) {

    public static final int DEFAULT_PAGE_SIZE = 20;
    public static final int MAX_PAGE_SIZE = 200;

    public static <T> PageResult<T> of(List<T> list, long total, int pageNo, int pageSize) {
        return new PageResult<>(list, total, pageNo, pageSize);
    }

    public static <T> PageResult<T> empty(int pageNo, int pageSize) {
        return new PageResult<>(List.of(), 0L, pageNo, pageSize);
    }
}
