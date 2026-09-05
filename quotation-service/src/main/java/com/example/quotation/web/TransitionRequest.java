package com.example.quotation.web;

import com.example.quotation.model.PipelineStage;
import jakarta.validation.constraints.NotNull;

public class TransitionRequest {

    @NotNull
    private PipelineStage toStage;

    public PipelineStage getToStage() { return toStage; }
    public void setToStage(PipelineStage toStage) { this.toStage = toStage; }
}
