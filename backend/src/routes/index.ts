import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.router';
import { usersRouter } from '../modules/users/users.router';
import { contactsRouter } from '../modules/contacts/contacts.router';
import { productsRouter } from '../modules/products/products.router';
import { catalogRouter } from '../modules/catalog/catalog.router';
import { recurringPlansRouter } from '../modules/recurring-plans/recurring-plans.router';
import { quotationTemplatesRouter } from '../modules/quotation-templates/quotation-templates.router';
import { taxRulesRouter } from '../modules/tax-rules/tax-rules.router';
import { discountRulesRouter } from '../modules/discount-rules/discount-rules.router';
import { paymentTermsRouter } from '../modules/payment-terms/payment-terms.router';
import { subscriptionsRouter } from '../modules/subscriptions/subscriptions.router';
import { invoicesRouter } from '../modules/invoices/invoices.router';
import { paymentsRouter } from '../modules/payments/payments.router';
import { reportsRouter } from '../modules/reports/reports.router';

const router = Router();

router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/contacts', contactsRouter);
router.use('/products', productsRouter);
router.use('/', catalogRouter);
router.use('/recurring-plans', recurringPlansRouter);
router.use('/quotation-templates', quotationTemplatesRouter);
router.use('/tax-rules', taxRulesRouter);
router.use('/discount-rules', discountRulesRouter);
router.use('/payment-terms', paymentTermsRouter);
router.use('/subscriptions', subscriptionsRouter);
router.use('/invoices', invoicesRouter);
router.use('/payments', paymentsRouter);
router.use('/reports', reportsRouter);

export { router };
