package com.yuanshu.starter.core.error;

/**
 * 业务异常。所有可预期的业务失败一律抛本异常，由 GlobalExceptionHandler 统一转响应体（§4.1.3）。
 *
 * <p>禁止：Controller 内捕获异常后自行拼 JSON；空 catch 吞异常。
 */
public class BizException extends RuntimeException {

    private final ErrorCode errorCode;
    private final transient Object[] args;

    public BizException(ErrorCode errorCode) {
        this(errorCode, new Object[0]);
    }

    public BizException(ErrorCode errorCode, Object... args) {
        super(errorCode.message());
        this.errorCode = errorCode;
        this.args = args;
    }

    public ErrorCode getErrorCode() {
        return errorCode;
    }

    public Object[] getArgs() {
        return args;
    }

    public static BizException of(ErrorCode errorCode) {
        return new BizException(errorCode);
    }
}
