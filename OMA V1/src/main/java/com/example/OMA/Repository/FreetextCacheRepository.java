package com.example.OMA.Repository;

import com.example.OMA.Model.FreetextCache;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface FreetextCacheRepository extends JpaRepository<FreetextCache, Long> {

    /**
     * Find paginated unprocessed cache entries for a category (with bert_score IS NULL)
     * Ordered by created_at for FIFO processing
     */
    @Query("SELECT fc FROM FreetextCache fc WHERE fc.categoryId = :categoryId AND fc.bertScore IS NULL ORDER BY fc.createdAt ASC")
    Page<FreetextCache> findUnprocessedByCategory(@Param("categoryId") Integer categoryId, Pageable pageable);

    /**
     * Find paginated cache entries with null bert_score globally (all unprocessed)
     * Ordered by created_at for FIFO processing
     * More efficient for batch processing with pagination
     */
    @Query("SELECT fc FROM FreetextCache fc WHERE fc.bertScore IS NULL ORDER BY fc.createdAt ASC")
    Page<FreetextCache> findByBertScoreIsNull(Pageable pageable);

    /**
     * Find all cache entries for a category (processed or unprocessed)
     */
    List<FreetextCache> findByCategoryId(Integer categoryId);

    /**
     * Count unprocessed entries for a category
     */
    @Query("SELECT COUNT(fc) FROM FreetextCache fc WHERE fc.categoryId = :categoryId AND fc.bertScore IS NULL")
    long countUnprocessedByCategory(@Param("categoryId") Integer categoryId);

    /**
     * Count all globally unprocessed entries (useful for monitoring)
     */
    @Query("SELECT COUNT(fc) FROM FreetextCache fc WHERE fc.bertScore IS NULL")
    long countAllUnprocessed();

    /**
     * Get average bert_score for a category (only processed entries)
     */
    @Query("SELECT AVG(fc.bertScore) FROM FreetextCache fc WHERE fc.categoryId = :categoryId AND fc.bertScore IS NOT NULL")
    BigDecimal getAverageBertScoreByCategory(@Param("categoryId") Integer categoryId);

    /**
     * Count total processed entries for a category
     */
    @Query("SELECT COUNT(fc) FROM FreetextCache fc WHERE fc.categoryId = :categoryId AND fc.bertScore IS NOT NULL")
    long countProcessedByCategory(@Param("categoryId") Integer categoryId);
}
