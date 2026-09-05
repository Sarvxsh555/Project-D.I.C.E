package com.dice.config;

import com.dice.domain.*;
import com.dice.domain.enums.*;
import com.dice.repository.*;
import com.dice.security.Role;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Seeds MySQL database with enterprise real-world master data on initial startup.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;
    private final WarehouseRepository warehouseRepository;
    private final InventoryRepository inventoryRepository;
    private final PolicyRepository policyRepository;
    private final DealRepository dealRepository;
    private final DealLineRepository dealLineRepository;
    private final ApprovalRepository approvalRepository;
    private final EvaluationRepository evaluationRepository;
    private final DecisionRepository decisionRepository;
    private final NegotiationRepository negotiationRepository;
    private final NegotiationMessageRepository negotiationMessageRepository;
    private final NegotiationVersionRepository negotiationVersionRepository;

    @Override
    @Transactional
    public void run(String... args) {
        if (customerRepository.count() > 0) {
            log.info("D.I.C.E. master data already present in MySQL — skipping seeding.");
            return;
        }

        log.info("Populating initial D.I.C.E. master data into MySQL...");

        // 1. Users
        seedUsers();

        // 2. Warehouses
        Warehouse whA = warehouseRepository.save(Warehouse.builder()
                .code("WH-A")
                .name("Main Logistics Hub - Bangalore")
                .region("APAC-SOUTH")
                .dispatchDays(1)
                .shippingCostFactor(BigDecimal.valueOf(1.00))
                .active(true)
                .build());

        Warehouse whB = warehouseRepository.save(Warehouse.builder()
                .code("WH-B")
                .name("Western Regional Center - Mumbai")
                .region("APAC-WEST")
                .dispatchDays(2)
                .shippingCostFactor(BigDecimal.valueOf(1.15))
                .active(true)
                .build());

        Warehouse whC = warehouseRepository.save(Warehouse.builder()
                .code("WH-C")
                .name("Northern Depot - Delhi NCR")
                .region("APAC-NORTH")
                .dispatchDays(2)
                .shippingCostFactor(BigDecimal.valueOf(1.20))
                .active(true)
                .build());

        // 3. Products
        Product pCore = productRepository.save(Product.builder()
                .sku("DICE-PLAT-ENT")
                .name("D.I.C.E. Enterprise Core Platform")
                .category("SOFTWARE")
                .listPrice(BigDecimal.valueOf(45000.00))
                .standardCost(BigDecimal.valueOf(12000.00))
                .floorPrice(BigDecimal.valueOf(30000.00))
                .stockOnHand(150)
                .leadTimeDays(0)
                .uom("UNIT")
                .active(true)
                .build());

        Product pAi = productRepository.save(Product.builder()
                .sku("DICE-MOD-AI")
                .name("Neural Predictive Pricing Engine")
                .category("MODULE")
                .listPrice(BigDecimal.valueOf(18500.00))
                .standardCost(BigDecimal.valueOf(4200.00))
                .floorPrice(BigDecimal.valueOf(12000.00))
                .stockOnHand(320)
                .leadTimeDays(0)
                .uom("UNIT")
                .active(true)
                .build());

        Product pImp = productRepository.save(Product.builder()
                .sku("DICE-SRV-IMP")
                .name("Enterprise Deployment & System Integration")
                .category("SERVICE")
                .listPrice(BigDecimal.valueOf(25000.00))
                .standardCost(BigDecimal.valueOf(8000.00))
                .floorPrice(BigDecimal.valueOf(18000.00))
                .stockOnHand(999)
                .leadTimeDays(5)
                .uom("PACKAGE")
                .active(true)
                .build());

        Product pHsm = productRepository.save(Product.builder()
                .sku("DICE-SEC-HSM")
                .name("High-Assurance Cryptographic Appliance")
                .category("HARDWARE")
                .listPrice(BigDecimal.valueOf(32000.00))
                .standardCost(BigDecimal.valueOf(19500.00))
                .floorPrice(BigDecimal.valueOf(24000.00))
                .stockOnHand(85)
                .leadTimeDays(14)
                .uom("UNIT")
                .active(true)
                .build());

        Product pSup = productRepository.save(Product.builder()
                .sku("DICE-SUP-247")
                .name("24x7 Mission-Critical Tier-1 SLA")
                .category("SUPPORT")
                .listPrice(BigDecimal.valueOf(12000.00))
                .standardCost(BigDecimal.valueOf(2500.00))
                .floorPrice(BigDecimal.valueOf(8500.00))
                .stockOnHand(999)
                .leadTimeDays(0)
                .uom("ANNUAL")
                .active(true)
                .build());

        // 4. Inventory allocations
        seedInventory(List.of(pCore, pAi, pImp, pHsm, pSup), List.of(whA, whB, whC));

        // 5. Customers
        Customer cTcs = customerRepository.save(Customer.builder()
                .name("Tata Consultancy Services")
                .segment(CustomerSegment.ENTERPRISE)
                .tier("PLATINUM")
                .region("APAC-IN")
                .creditLimit(BigDecimal.valueOf(1500000.00))
                .outstandingBalance(BigDecimal.valueOf(240000.00))
                .paymentTermsDays(45)
                .riskScore(12)
                .onTimePaymentRate(BigDecimal.valueOf(98.50))
                .portalUsername("customer")
                .active(true)
                .build());

        Customer cInfy = customerRepository.save(Customer.builder()
                .name("Infosys Limited")
                .segment(CustomerSegment.ENTERPRISE)
                .tier("GOLD")
                .region("APAC-IN")
                .creditLimit(BigDecimal.valueOf(1200000.00))
                .outstandingBalance(BigDecimal.valueOf(180000.00))
                .paymentTermsDays(30)
                .riskScore(18)
                .onTimePaymentRate(BigDecimal.valueOf(96.00))
                .active(true)
                .build());

        Customer cWipro = customerRepository.save(Customer.builder()
                .name("Wipro Technologies")
                .segment(CustomerSegment.MID_MARKET)
                .tier("SILVER")
                .region("APAC-IN")
                .creditLimit(BigDecimal.valueOf(600000.00))
                .outstandingBalance(BigDecimal.valueOf(95000.00))
                .paymentTermsDays(30)
                .riskScore(28)
                .onTimePaymentRate(BigDecimal.valueOf(91.50))
                .active(true)
                .build());

        Customer cHcl = customerRepository.save(Customer.builder()
                .name("HCL Technologies")
                .segment(CustomerSegment.MID_MARKET)
                .tier("SILVER")
                .region("APAC-IN")
                .creditLimit(BigDecimal.valueOf(500000.00))
                .outstandingBalance(BigDecimal.valueOf(110000.00))
                .paymentTermsDays(30)
                .riskScore(32)
                .onTimePaymentRate(BigDecimal.valueOf(89.00))
                .active(true)
                .build());

        Customer cTechM = customerRepository.save(Customer.builder()
                .name("Tech Mahindra")
                .segment(CustomerSegment.ENTERPRISE)
                .tier("GOLD")
                .region("APAC-IN")
                .creditLimit(BigDecimal.valueOf(900000.00))
                .outstandingBalance(BigDecimal.valueOf(145000.00))
                .paymentTermsDays(45)
                .riskScore(22)
                .onTimePaymentRate(BigDecimal.valueOf(94.20))
                .active(true)
                .build());

        // 6. Policies
        seedPolicies();

        // 7. Real Deals
        seedDeals(cTcs, cInfy, cWipro, cHcl, cTechM, pCore, pAi, pImp, pHsm, whA, whB);

        log.info("D.I.C.E. master data populated successfully in MySQL!");
    }

    private void seedUsers() {
        userRepository.save(User.builder()
                .username("admin")
                .fullName("Executive Administrator")
                .email("admin@dice.enterprise")
                .role(Role.ADMIN)
                .active(true)
                .build());

        userRepository.save(User.builder()
                .username("sales_rep")
                .fullName("Sarah Jenkins")
                .email("s.jenkins@dice.enterprise")
                .role(Role.SALES_REP)
                .active(true)
                .build());

        userRepository.save(User.builder()
                .username("sales_manager")
                .fullName("Michael Chang")
                .email("m.chang@dice.enterprise")
                .role(Role.SALES_MANAGER)
                .active(true)
                .build());

        userRepository.save(User.builder()
                .username("finance")
                .fullName("David Vance")
                .email("d.vance@dice.enterprise")
                .role(Role.FINANCE)
                .active(true)
                .build());

        userRepository.save(User.builder()
                .username("operations")
                .fullName("Elena Rostova")
                .email("e.rostova@dice.enterprise")
                .role(Role.OPERATIONS)
                .active(true)
                .build());

        userRepository.save(User.builder()
                .username("customer")
                .fullName("Rajesh Sharma")
                .email("r.sharma@tcs.com")
                .role(Role.CUSTOMER)
                .active(true)
                .build());
    }

    private void seedInventory(List<Product> products, List<Warehouse> warehouses) {
        for (Product product : products) {
            for (Warehouse warehouse : warehouses) {
                int qty = "HARDWARE".equals(product.getCategory()) ? 25 : 100;
                inventoryRepository.save(Inventory.builder()
                        .product(product)
                        .warehouse(warehouse)
                        .availableQty(qty)
                        .reservedQty(0)
                        .fulfilledQty(0)
                        .build());
            }
        }
    }

    private void seedPolicies() {
        policyRepository.save(Policy.builder()
                .code("POL-DISC-STD")
                .name("Standard Discount Threshold")
                .description("Line items with >15% discount require Sales Manager approval")
                .type(PolicyType.DISCOUNT_LIMIT)
                .severity(PolicySeverity.APPROVAL_REQUIRED)
                .thresholdValue(BigDecimal.valueOf(15.00))
                .requiredRole("SALES_MANAGER")
                .priority(10)
                .active(true)
                .build());

        policyRepository.save(Policy.builder()
                .code("POL-DISC-EXEC")
                .name("Executive Discount Escalation")
                .description("Line items with >25% discount require Finance sign-off")
                .type(PolicyType.DISCOUNT_LIMIT)
                .severity(PolicySeverity.APPROVAL_REQUIRED)
                .thresholdValue(BigDecimal.valueOf(25.00))
                .requiredRole("FINANCE")
                .priority(20)
                .active(true)
                .build());

        policyRepository.save(Policy.builder()
                .code("POL-DISC-MAX")
                .name("Maximum Permissible Discount")
                .description("Discounts exceeding 35% are strictly blocked by core policy")
                .type(PolicyType.DISCOUNT_LIMIT)
                .severity(PolicySeverity.BLOCKING)
                .thresholdValue(BigDecimal.valueOf(35.00))
                .requiredRole("ADMIN")
                .priority(30)
                .active(true)
                .build());

        policyRepository.save(Policy.builder()
                .code("POL-MARGIN-MIN")
                .name("Minimum Blended Margin Floor")
                .description("Deals yielding below 20% margin trigger mandatory Sales Manager sign-off")
                .type(PolicyType.MARGIN_FLOOR)
                .severity(PolicySeverity.APPROVAL_REQUIRED)
                .thresholdValue(BigDecimal.valueOf(20.00))
                .requiredRole("SALES_MANAGER")
                .priority(15)
                .active(true)
                .build());

        policyRepository.save(Policy.builder()
                .code("POL-CREDIT-CAP")
                .name("Credit Exposure Governance")
                .description("Total deal value exceeding customer available credit requires Finance clearance")
                .type(PolicyType.CREDIT_LIMIT)
                .severity(PolicySeverity.APPROVAL_REQUIRED)
                .thresholdValue(BigDecimal.valueOf(100000.00))
                .requiredRole("FINANCE")
                .priority(5)
                .active(true)
                .build());
    }

    private void seedDeals(Customer cTcs, Customer cInfy, Customer cWipro, Customer cHcl, Customer cTechM,
                           Product pCore, Product pAi, Product pImp, Product pHsm,
                           Warehouse whA, Warehouse whB) {
        // DL-2024-001 (TCS - Pending Approval)
        Deal d1 = Deal.builder()
                .dealNumber("DL-2024-001")
                .customer(cTcs)
                .status(DealStatus.PENDING_APPROVAL)
                .currency("USD")
                .subtotal(BigDecimal.valueOf(132000.00))
                .discountAmount(BigDecimal.valueOf(19800.00))
                .totalAmount(BigDecimal.valueOf(112200.00))
                .marginPercent(BigDecimal.valueOf(64.50))
                .riskScore(15)
                .riskLevel(RiskLevel.LOW)
                .healthScore(88)
                .billingStatus(BillingStatus.NOT_INVOICED)
                .requestedDeliveryDate(LocalDate.now().plusDays(30))
                .ownerUsername("sales_rep")
                .build();
        d1 = dealRepository.save(d1);

        DealLine dl1_1 = DealLine.builder()
                .deal(d1)
                .product(pCore)
                .lineNumber(1)
                .quantity(2)
                .unitPrice(pCore.getListPrice())
                .discountPercent(BigDecimal.valueOf(15.00))
                .lineTotal(BigDecimal.valueOf(76500.00))
                .marginPercent(BigDecimal.valueOf(68.60))
                .warehouse(whA)
                .fulfillmentStatus(FulfillmentStatus.NOT_STARTED)
                .build();

        DealLine dl1_2 = DealLine.builder()
                .deal(d1)
                .product(pAi)
                .lineNumber(2)
                .quantity(2)
                .unitPrice(pAi.getListPrice())
                .discountPercent(BigDecimal.valueOf(15.00))
                .lineTotal(BigDecimal.valueOf(31450.00))
                .marginPercent(BigDecimal.valueOf(73.20))
                .warehouse(whA)
                .fulfillmentStatus(FulfillmentStatus.NOT_STARTED)
                .build();

        dealLineRepository.saveAll(List.of(dl1_1, dl1_2));

        Evaluation eval1 = evaluationRepository.save(Evaluation.builder()
                .deal(d1)
                .triggeredBy("DISCOUNT_SUBMITTED")
                .marginPercent(BigDecimal.valueOf(64.50))
                .discountPercent(BigDecimal.valueOf(15.00))
                .riskScore(15)
                .riskLevel(RiskLevel.LOW)
                .healthScore(88)
                .outcome(DecisionOutcome.REQUIRE_APPROVAL)
                .policyResults("[{\"policyCode\":\"POL-DISC-STD\",\"severity\":\"APPROVAL_REQUIRED\",\"message\":\"15% discount on Enterprise Core exceeds auto-approve threshold\"}]")
                .build());

        decisionRepository.save(Decision.builder()
                .deal(d1)
                .evaluation(eval1)
                .outcome(DecisionOutcome.REQUIRE_APPROVAL)
                .rationale("15% volume discount requested by Tata Consultancy Services. Commercial margin (64.5%) is healthy. Awaiting Sales Manager sign-off.")
                .build());

        approvalRepository.save(Approval.builder()
                .deal(d1)
                .evaluation(eval1)
                .policyCode("POL-DISC-STD")
                .requiredRole(Role.SALES_MANAGER.name())
                .approvalLevel(ApprovalLevel.SALES_MANAGER)
                .status(ApprovalStatus.PENDING)
                .requestedBy("sales_rep")
                .reason("Enterprise expansion discount exception (15%) for TCS Annual Platform refresh")
                .requestedAt(Instant.now().minus(2, ChronoUnit.HOURS))
                .slaDueAt(Instant.now().plus(6, ChronoUnit.HOURS))
                .build());

        // DL-2024-002 (Infosys - Approved)
        Deal d2 = Deal.builder()
                .dealNumber("DL-2024-002")
                .customer(cInfy)
                .status(DealStatus.APPROVED)
                .currency("USD")
                .subtotal(BigDecimal.valueOf(88500.00))
                .discountAmount(BigDecimal.valueOf(4425.00))
                .totalAmount(BigDecimal.valueOf(84075.00))
                .marginPercent(BigDecimal.valueOf(68.20))
                .riskScore(12)
                .riskLevel(RiskLevel.LOW)
                .healthScore(95)
                .billingStatus(BillingStatus.NOT_INVOICED)
                .requestedDeliveryDate(LocalDate.now().plusDays(21))
                .ownerUsername("sales_rep")
                .build();
        d2 = dealRepository.save(d2);

        DealLine dl2_1 = DealLine.builder()
                .deal(d2)
                .product(pCore)
                .lineNumber(1)
                .quantity(1)
                .unitPrice(pCore.getListPrice())
                .discountPercent(BigDecimal.valueOf(5.00))
                .lineTotal(BigDecimal.valueOf(42750.00))
                .marginPercent(BigDecimal.valueOf(71.90))
                .warehouse(whA)
                .fulfillmentStatus(FulfillmentStatus.NOT_STARTED)
                .build();

        dealLineRepository.save(dl2_1);

        // DL-2024-003 (Wipro - In Negotiation)
        Deal d3 = Deal.builder()
                .dealNumber("DL-2024-003")
                .customer(cWipro)
                .status(DealStatus.IN_NEGOTIATION)
                .currency("USD")
                .subtotal(BigDecimal.valueOf(60500.00))
                .discountAmount(BigDecimal.valueOf(6050.00))
                .totalAmount(BigDecimal.valueOf(54450.00))
                .marginPercent(BigDecimal.valueOf(58.00))
                .riskScore(24)
                .riskLevel(RiskLevel.MODERATE)
                .healthScore(82)
                .billingStatus(BillingStatus.NOT_INVOICED)
                .requestedDeliveryDate(LocalDate.now().plusDays(15))
                .ownerUsername("sales_rep")
                .build();
        d3 = dealRepository.save(d3);

        DealLine dl3_1 = DealLine.builder()
                .deal(d3)
                .product(pAi)
                .lineNumber(1)
                .quantity(2)
                .unitPrice(pAi.getListPrice())
                .discountPercent(BigDecimal.valueOf(10.00))
                .lineTotal(BigDecimal.valueOf(33300.00))
                .marginPercent(BigDecimal.valueOf(74.70))
                .warehouse(whB)
                .fulfillmentStatus(FulfillmentStatus.NOT_STARTED)
                .build();

        dealLineRepository.save(dl3_1);

        // Create Negotiation thread for DL-2024-003
        Negotiation neg3 = negotiationRepository.save(Negotiation.builder()
                .deal(d3)
                .customer(cWipro)
                .build());

        negotiationMessageRepository.save(NegotiationMessage.builder()
                .negotiation(neg3)
                .author("customer")
                .authorRole("CUSTOMER")
                .content("We are reviewing the commercial terms. Can we extend the payment terms to 45 days and apply a 12% blended discount?")
                .build());

        negotiationMessageRepository.save(NegotiationMessage.builder()
                .negotiation(neg3)
                .author("sales_rep")
                .authorRole("INTERNAL")
                .content("Thanks for the proposal. We can commit to 10% discount on the Neural Pricing Engine modules, and we are reviewing payment terms with Finance.")
                .build());

        // DL-2024-004 (HCL - Confirmed)
        Deal d4 = Deal.builder()
                .dealNumber("DL-2024-004")
                .customer(cHcl)
                .status(DealStatus.CONFIRMED)
                .currency("USD")
                .subtotal(BigDecimal.valueOf(95000.00))
                .discountAmount(BigDecimal.valueOf(6000.00))
                .totalAmount(BigDecimal.valueOf(89000.00))
                .marginPercent(BigDecimal.valueOf(62.00))
                .riskScore(20)
                .riskLevel(RiskLevel.LOW)
                .healthScore(85)
                .billingStatus(BillingStatus.DRAFT_INVOICE)
                .requestedDeliveryDate(LocalDate.now().plusDays(10))
                .ownerUsername("sales_rep")
                .build();
        d4 = dealRepository.save(d4);

        DealLine dl4_1 = DealLine.builder()
                .deal(d4)
                .product(pHsm)
                .lineNumber(1)
                .quantity(2)
                .unitPrice(pHsm.getListPrice())
                .discountPercent(BigDecimal.valueOf(6.30))
                .lineTotal(BigDecimal.valueOf(59968.00))
                .marginPercent(BigDecimal.valueOf(35.00))
                .warehouse(whA)
                .fulfillmentStatus(FulfillmentStatus.ALLOCATED)
                .build();

        dealLineRepository.save(dl4_1);

        // DL-2024-005 (Tech Mahindra - Fulfilling)
        Deal d5 = Deal.builder()
                .dealNumber("DL-2024-005")
                .customer(cTechM)
                .status(DealStatus.FULFILLING)
                .currency("USD")
                .subtotal(BigDecimal.valueOf(150000.00))
                .discountAmount(BigDecimal.valueOf(15000.00))
                .totalAmount(BigDecimal.valueOf(135000.00))
                .marginPercent(BigDecimal.valueOf(65.00))
                .riskScore(18)
                .riskLevel(RiskLevel.LOW)
                .healthScore(90)
                .billingStatus(BillingStatus.INVOICED)
                .requestedDeliveryDate(LocalDate.now().plusDays(5))
                .ownerUsername("sales_rep")
                .build();
        d5 = dealRepository.save(d5);

        DealLine dl5_1 = DealLine.builder()
                .deal(d5)
                .product(pCore)
                .lineNumber(1)
                .quantity(3)
                .unitPrice(pCore.getListPrice())
                .discountPercent(BigDecimal.valueOf(10.00))
                .lineTotal(BigDecimal.valueOf(121500.00))
                .marginPercent(BigDecimal.valueOf(70.30))
                .warehouse(whA)
                .fulfillmentStatus(FulfillmentStatus.SHIPPED)
                .build();

        dealLineRepository.save(dl5_1);
    }
}
