import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, optionalAuth } from '../../middleware/auth';
import { requireAdminOrInternal } from '../../middleware/role-guard';
import { createProductSchema, updateProductSchema } from './products.schema';
import * as svc from './products.service';

export const productsRouter = Router();

productsRouter.get('/', optionalAuth, async (req, res: Response, next: NextFunction) => {
  try {
    const { page, pageSize, categoryId, search } = req.query;
    res.json(await svc.listProducts({
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 12,
      categoryId: categoryId as string,
      search: search as string,
    }));
  } catch (e) { next(e); }
});

productsRouter.get('/slug/:slug', optionalAuth, async (req, res: Response, next: NextFunction) => {
  try { res.json(await svc.getProductBySlug(req.params.slug)); } catch (e) { next(e); }
});

productsRouter.get('/:id', authenticate, requireAdminOrInternal, async (req, res: Response, next: NextFunction) => {
  try { res.json(await svc.getProductById(req.params.id)); } catch (e) { next(e); }
});

productsRouter.post('/', authenticate, requireAdminOrInternal, async (req, res: Response, next: NextFunction) => {
  try { res.status(201).json(await svc.createProduct(createProductSchema.parse(req.body))); } catch (e) { next(e); }
});

productsRouter.put('/:id', authenticate, requireAdminOrInternal, async (req, res: Response, next: NextFunction) => {
  try { res.json(await svc.updateProduct(req.params.id, updateProductSchema.parse(req.body))); } catch (e) { next(e); }
});

productsRouter.delete('/:id', authenticate, requireAdminOrInternal, async (req, res: Response, next: NextFunction) => {
  try { res.json(await svc.deleteProduct(req.params.id)); } catch (e) { next(e); }
});

productsRouter.post('/:id/variants', authenticate, requireAdminOrInternal, async (req, res: Response, next: NextFunction) => {
  try { res.status(201).json(await svc.addProductVariant(req.params.id, req.body.attributeValueIds)); } catch (e) { next(e); }
});

productsRouter.post('/:id/plan-pricing', authenticate, requireAdminOrInternal, async (req, res: Response, next: NextFunction) => {
  try { res.status(201).json(await svc.addProductPlanPricing(req.params.id, req.body)); } catch (e) { next(e); }
});
