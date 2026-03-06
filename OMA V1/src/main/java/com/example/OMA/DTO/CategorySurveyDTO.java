package com.example.OMA.DTO;
 
import java.util.List;
 
import com.fasterxml.jackson.annotation.JsonProperty;
 
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
 
@Setter
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class CategorySurveyDTO {
 
    @JsonProperty("category_id")
    private Integer categoryId;
    @JsonProperty("category_text")
    private String categoryName;
    @JsonProperty("questions")
    private List<MainQuestionResponseDTO> mainQuestions;
 
}