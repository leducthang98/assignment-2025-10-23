import { Router } from 'express';
import {
  createResource,
  getResources,
  getResource,
  updateResource,
  deleteResource,
} from '../controllers/resourceController';

const router = Router();

router.post('/resources', createResource);
router.get('/resources', getResources);
router.get('/resources/:id', getResource);
router.put('/resources/:id', updateResource);
router.delete('/resources/:id', deleteResource);

export default router;

