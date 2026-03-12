package com.example.OMA.Model;

import java.math.BigDecimal;
import java.util.List;

public class BertBatchResponse {

    private List<BigDecimal> predicted_class_ids;
    private List<Double> confidences;

    public List<BigDecimal> getPredicted_class_ids() {
        return predicted_class_ids;
    }

    public void setPredicted_class_ids(List<BigDecimal> predicted_class_ids) {
        this.predicted_class_ids = predicted_class_ids;
    }

    public List<Double> getConfidences() {
        return confidences;
    }

    public void setConfidences(List<Double> confidences) {
        this.confidences = confidences;
    }
}
