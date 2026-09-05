package com.dice.service;

import com.dice.config.DiceProperties;
import com.dice.domain.AnomalyAlert;
import com.dice.domain.Customer;
import com.dice.domain.Deal;
import com.dice.domain.DealLine;
import com.dice.domain.Evaluation;
import com.dice.domain.Product;
import com.dice.repository.AnomalyAlertRepository;
import com.dice.repository.EvaluationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DiscountAnomalyServiceTest {

    @Mock private EvaluationRepository evaluationRepository;
    @Mock private AnomalyAlertRepository anomalyAlertRepository;

    private DiscountAnomalyService service;
    private Deal deal;

    @BeforeEach
    void setUp() {
        DiceProperties properties = new DiceProperties(null, null, null, null, null, null,
                new DiceProperties.Anomaly(1.5));
        service = new DiscountAnomalyService(evaluationRepository, anomalyAlertRepository, properties);

        Customer customer = Customer.builder().id(UUID.randomUUID()).name("Acme").build();
        Product product = Product.builder().id(UUID.randomUUID()).sku("SKU-1").name("Widget")
                .listPrice(BigDecimal.valueOf(100)).standardCost(BigDecimal.valueOf(50)).build();
        deal = Deal.builder().id(UUID.randomUUID()).dealNumber("DICE-000001").customer(customer)
                .lines(new ArrayList<>()).build();
        DealLine line = DealLine.builder().id(UUID.randomUUID()).deal(deal).product(product)
                .quantity(10).unitPrice(BigDecimal.valueOf(100)).discountPercent(BigDecimal.valueOf(16)).build();
        deal.getLines().add(line);
        deal.setSubtotal(BigDecimal.valueOf(1000));
        deal.setDiscountAmount(BigDecimal.valueOf(160));
        lenient().when(anomalyAlertRepository.save(any())).thenAnswer(inv -> {
            AnomalyAlert alert = inv.getArgument(0);
            if (alert.getId() == null) alert.setId(UUID.randomUUID());
            return alert;
        });
    }

    private List<Evaluation> history(double... discounts) {
        List<Evaluation> evaluations = new ArrayList<>();
        for (double d : discounts) {
            evaluations.add(Evaluation.builder().discountPercent(BigDecimal.valueOf(d)).build());
        }
        return evaluations;
    }

    @Test
    void noHistoryMeansZeroBaselineAndNoAnomaly() {
        when(evaluationRepository.findByDealIdOrderByCreatedAtDesc(deal.getId())).thenReturn(List.of());
        when(anomalyAlertRepository.findByDealIdAndMetricAndResolvedFalse(any(), any())).thenReturn(Optional.empty());

        Optional<AnomalyAlert> result = service.evaluate(deal);

        assertThat(result).isEmpty();
        verify(anomalyAlertRepository, never()).save(any());
    }

    @Test
    void discountFarAboveHistoricalAverageIsFlagged() {
        when(evaluationRepository.findByDealIdOrderByCreatedAtDesc(deal.getId())).thenReturn(history(8, 8, 8));
        when(anomalyAlertRepository.findByDealIdAndMetricAndResolvedFalse(any(), any())).thenReturn(Optional.empty());

        Optional<AnomalyAlert> result = service.evaluate(deal);

        assertThat(result).isPresent();
        assertThat(result.get().getBaseline()).isEqualByComparingTo("8");
        assertThat(result.get().getCurrentValue()).isEqualByComparingTo("16");
        verify(anomalyAlertRepository).save(any());
    }

    @Test
    void unchangedAnomalyDoesNotRaiseASecondAlert() {
        when(evaluationRepository.findByDealIdOrderByCreatedAtDesc(deal.getId())).thenReturn(history(8, 8, 8));
        AnomalyAlert open = AnomalyAlert.builder().id(UUID.randomUUID()).deal(deal)
                .metric(DiscountAnomalyService.METRIC_DISCOUNT_PERCENT)
                .baseline(BigDecimal.valueOf(8)).currentValue(BigDecimal.valueOf(16))
                .ratio(new BigDecimal("2.000000")).build();
        when(anomalyAlertRepository.findByDealIdAndMetricAndResolvedFalse(deal.getId(),
                DiscountAnomalyService.METRIC_DISCOUNT_PERCENT)).thenReturn(Optional.of(open));

        Optional<AnomalyAlert> result = service.evaluate(deal);

        assertThat(result).contains(open);
        verify(anomalyAlertRepository, never()).save(any());
    }

    @Test
    void resolvesOpenAlertWhenNoLongerAnomalous() {
        deal.getLines().get(0).setDiscountPercent(BigDecimal.valueOf(8));
        deal.setDiscountAmount(BigDecimal.valueOf(80));
        when(evaluationRepository.findByDealIdOrderByCreatedAtDesc(deal.getId())).thenReturn(history(8, 8, 8));
        AnomalyAlert open = AnomalyAlert.builder().id(UUID.randomUUID()).deal(deal)
                .metric(DiscountAnomalyService.METRIC_DISCOUNT_PERCENT)
                .baseline(BigDecimal.valueOf(8)).currentValue(BigDecimal.valueOf(16))
                .ratio(new BigDecimal("2.000000")).resolved(false).build();
        when(anomalyAlertRepository.findByDealIdAndMetricAndResolvedFalse(deal.getId(),
                DiscountAnomalyService.METRIC_DISCOUNT_PERCENT)).thenReturn(Optional.of(open));

        Optional<AnomalyAlert> result = service.evaluate(deal);

        assertThat(result).isEmpty();
        assertThat(open.isResolved()).isTrue();
        verify(anomalyAlertRepository).save(open);
    }
}
