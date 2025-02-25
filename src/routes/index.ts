import { Router } from 'express';
import weatherRoutes from './weatherRoutes';
import healthRoutes from './healthRoutes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/weather', weatherRoutes);

export default router;
