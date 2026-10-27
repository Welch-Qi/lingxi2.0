package com.yuanshu.starter.core.web;

import com.yuanshu.starter.core.error.BizException;
import com.yuanshu.starter.core.error.PlatformErrorCode;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * 全局异常处理：业务异常统一转统一响应体，禁止各 Controller 自行拼装（§4.1.3）。
 *
 * <p>为什么不把异常堆栈返回给前端：避免泄露内部实现与数据（§4.9.3）；堆栈只进日志。
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(BizException.class)
    public R<Void> handleBiz(BizException ex) {
        log.warn("BIZ|error|{}|{}", ex.getErrorCode().code(), ex.getErrorCode().message());
        return R.fail(ex.getErrorCode());
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, BindException.class,
            ConstraintViolationException.class})
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public R<Void> handleValidation(Exception ex) {
        log.warn("BIZ|validation|failed|{}", ex.getMessage());
        return R.fail(PlatformErrorCode.PARAM_INVALID);
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public R<Void> handleUnexpected(Exception ex) {
        log.error("BIZ|error|unexpected", ex);
        return R.fail(PlatformErrorCode.SYSTEM_ERROR);
    }
}
