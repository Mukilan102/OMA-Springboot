package com.example.OMA.Model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "freetext_cache")
public class FreetextCache {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "cache_id")
    private Long cacheId;

    @Column(name = "main_question_id", nullable = false)
    private Integer mainQuestionId;

    @Column(name = "category_id", nullable = false)
    private Integer categoryId;

    @Column(name = "free_text", nullable = false, columnDefinition = "TEXT")
    private String freeText;

    @Column(name = "bert_score")
    private BigDecimal bertScore;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    public FreetextCache() {}

    public FreetextCache(Integer mainQuestionId, Integer categoryId, String freeText) {
        this.mainQuestionId = mainQuestionId;
        this.categoryId = categoryId;
        this.freeText = freeText;
        this.bertScore = null;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (updatedAt == null) {
            updatedAt = Instant.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    public Long getCacheId() { return cacheId; }
    public void setCacheId(Long cacheId) { this.cacheId = cacheId; }

    public Integer getMainQuestionId() { return mainQuestionId; }
    public void setMainQuestionId(Integer mainQuestionId) { this.mainQuestionId = mainQuestionId; }

    public Integer getCategoryId() { return categoryId; }
    public void setCategoryId(Integer categoryId) { this.categoryId = categoryId; }

    public String getFreeText() { return freeText; }
    public void setFreeText(String freeText) { this.freeText = freeText; }

    public BigDecimal getBertScore() { return bertScore; }
    public void setBertScore(BigDecimal bertScore) { this.bertScore = bertScore; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
