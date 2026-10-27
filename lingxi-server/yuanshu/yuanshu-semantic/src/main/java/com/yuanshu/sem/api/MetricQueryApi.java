package com.yuanshu.sem.api;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * 指标口径查询 —— 指标定义的唯一来源（DT-05）。
 *
 * <p>业务模块不得自算口径；同名指标统一定义，杜绝"同名不同义"（三产品规划 §2.4 指标口径中心）。
 * <p>原登记于 lingxi-data 契约，三产品归口后由元枢语义管理承载；调用方经 HTTP 出口与契约登记见 contracts.md。
 */
public interface MetricQueryApi {

    /** 按指标编码 + 维度取指标视图（含口径版本，保证可追溯）。 */
    MetricView query(MetricQuery query);

    /** 指标查询条件。时间一律 UTC（技术规约2.0 §4.1.3）。 */
    record MetricQuery(String metricCode, List<String> dimensionCodes, Instant from, Instant to) {
    }

    /** 指标只读视图。value 为字符串承载，避免精度约定冲突；单位与口径版本必须回显。 */
    record MetricView(String metricCode, String caliberVersion, String unit,
                      Map<String, String> dimensions, String value) {
    }
}
