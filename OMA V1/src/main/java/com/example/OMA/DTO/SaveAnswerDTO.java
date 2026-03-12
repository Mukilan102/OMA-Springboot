package com.example.OMA.DTO;


/**
 * DTO for saving a single answer when the user clicks "Next".
 * {
 *   "sessionId":       "anon-...",
 *   "mainQuestionId":  2,
 *   "answer":          3            // or [10,12] or "text" or {"1":30,"2":31}
 * }
 */
public class SaveAnswerDTO {

    private String sessionId;
    private Integer mainQuestionId;
    private Object answer;

    public SaveAnswerDTO() {}

    public String  getSessionId()                    { return sessionId; }
    public void    setSessionId(String sessionId)    { this.sessionId = sessionId; }

    public Integer getMainQuestionId()                         { return mainQuestionId; }
    public void    setMainQuestionId(Integer mainQuestionId)   { this.mainQuestionId = mainQuestionId; }

    public Object  getAnswer()                       { return answer; }
    public void    setAnswer(Object answer)           { this.answer = answer; }
}
