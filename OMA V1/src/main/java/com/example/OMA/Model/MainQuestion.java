package com.example.OMA.Model;
 
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
 
@Entity
@Table(name = "mainquestion")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MainQuestion {
 
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "main_question_id")
    private Integer mainQuestionId;
 
    @Column(name = "category_id", nullable = false)
    private Long categoryId;
 
    @Column(name = "question_text", nullable = false, columnDefinition = "TEXT")
    private String questionText;
 
    @Column(name = "question_type", nullable = false)
    private String questionType;
 
    @Column(name = "weight")
    private Integer weight;
 
}