package com.dice.service;

import com.dice.domain.Customer;
import com.dice.domain.Deal;
import com.dice.domain.DealLine;
import com.dice.domain.Product;
import com.dice.domain.Subscription;
import com.dice.domain.SubscriptionBillingSchedule;
import com.dice.domain.SubscriptionPlan;
import com.dice.domain.enums.BillingMode;
import com.dice.domain.enums.DealStatus;
import com.dice.domain.enums.RecurringInterval;
import com.dice.domain.enums.SubscriptionStatus;
import com.dice.repository.DealRepository;
import com.dice.repository.SubscriptionBillingScheduleRepository;
import com.dice.repository.SubscriptionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SubscriptionServiceTest {

    @Mock private SubscriptionRepository subscriptionRepository;
    @Mock private SubscriptionBillingScheduleRepository scheduleRepository;
    @Mock private DealRepository dealRepository;

    private SubscriptionService service;
    private Deal deal;
    private Customer customer;
    private SubscriptionPlan plan;

    @BeforeEach
    void setUp() {
        service = new SubscriptionService(subscriptionRepository, scheduleRepository, dealRepository);

        customer = Customer.builder().id(UUID.randomUUID()).name("Acme").build();
        deal = Deal.builder().id(UUID.randomUUID()).dealNumber("DICE-000001").customer(customer)
                .status(DealStatus.CONFIRMED).lines(new ArrayList<>()).build();
        plan = SubscriptionPlan.builder().id(UUID.randomUUID()).name("Pro Monthly")
                .interval(RecurringInterval.MONTHLY).price(BigDecimal.valueOf(99)).build();

        lenient().when(subscriptionRepository.save(any(Subscription.class))).thenAnswer(inv -> {
            Subscription s = inv.getArgument(0);
            if (s.getId() == null) s.setId(UUID.randomUUID());
            return s;
        });
        lenient().when(scheduleRepository.save(any(SubscriptionBillingSchedule.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private DealLine recurringLine() {
        Product product = Product.builder().id(UUID.randomUUID()).sku("SUB-1").name("Subscription")
                .listPrice(BigDecimal.valueOf(99)).standardCost(BigDecimal.TEN).build();
        DealLine line = DealLine.builder().id(UUID.randomUUID()).deal(deal).product(product)
                .quantity(1).unitPrice(BigDecimal.valueOf(99)).discountPercent(BigDecimal.ZERO)
                .billingMode(BillingMode.RECURRING).subscriptionPlan(plan).build();
        deal.getLines().add(line);
        return line;
    }

    @Test
    void createsSubscriptionWithScheduleForRecurringLine() {
        DealLine line = recurringLine();
        when(subscriptionRepository.findByDealLineId(line.getId())).thenReturn(Optional.empty());

        Subscription subscription = service.createIfAbsent(deal, line, plan, "finance1");

        assertThat(subscription.getStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
        assertThat(subscription.getNextBillingDate()).isEqualTo(LocalDate.now().plusMonths(1));
        verify(scheduleRepository).save(any(SubscriptionBillingSchedule.class));
    }

    @Test
    void creatingTwiceForSameLineIsIdempotent() {
        DealLine line = recurringLine();
        Subscription existing = Subscription.builder().id(UUID.randomUUID()).dealLine(line).build();
        when(subscriptionRepository.findByDealLineId(line.getId())).thenReturn(Optional.of(existing));

        Subscription subscription = service.createIfAbsent(deal, line, plan, "finance1");

        assertThat(subscription).isSameAs(existing);
        verify(subscriptionRepository, never()).save(any());
    }

    @Test
    void syncFromDealRejectsDraftDeals() {
        deal.setStatus(DealStatus.DRAFT);
        recurringLine();
        when(dealRepository.findWithLinesById(deal.getId())).thenReturn(Optional.of(deal));

        assertThat(org.assertj.core.api.Assertions.catchThrowable(() ->
                service.syncFromDeal(deal.getId(), "finance1")))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void syncFromDealCreatesOnlyForRecurringLinesWithPlans() {
        recurringLine();
        Product oneTimeProduct = Product.builder().id(UUID.randomUUID()).sku("ONE-1").name("Widget")
                .listPrice(BigDecimal.TEN).standardCost(BigDecimal.ONE).build();
        deal.getLines().add(DealLine.builder().id(UUID.randomUUID()).deal(deal).product(oneTimeProduct)
                .quantity(1).unitPrice(BigDecimal.TEN).discountPercent(BigDecimal.ZERO)
                .billingMode(BillingMode.ONE_TIME).build());
        when(dealRepository.findWithLinesById(deal.getId())).thenReturn(Optional.of(deal));
        when(subscriptionRepository.findByDealLineId(any())).thenReturn(Optional.empty());

        List<Subscription> created = service.syncFromDeal(deal.getId(), "finance1");

        assertThat(created).hasSize(1);
    }

    @Test
    void advanceScheduleMovesNextBillingDateForward() {
        Subscription subscription = Subscription.builder().id(UUID.randomUUID())
                .nextBillingDate(LocalDate.of(2026, 1, 1)).build();
        SubscriptionBillingSchedule schedule = SubscriptionBillingSchedule.builder()
                .id(UUID.randomUUID()).subscription(subscription).frequency(RecurringInterval.MONTHLY)
                .nextBillingDate(LocalDate.of(2026, 1, 1)).active(true).build();
        when(scheduleRepository.findBySubscriptionId(subscription.getId())).thenReturn(Optional.of(schedule));
        when(subscriptionRepository.findById(subscription.getId())).thenReturn(Optional.of(subscription));

        SubscriptionBillingSchedule advanced = service.advanceSchedule(subscription.getId());

        assertThat(advanced.getNextBillingDate()).isEqualTo(LocalDate.of(2026, 2, 1));
        assertThat(subscription.getNextBillingDate()).isEqualTo(LocalDate.of(2026, 2, 1));
    }
}
