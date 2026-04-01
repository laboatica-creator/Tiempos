import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middlewares/auth.middleware';
import { 
  getActiveAnnouncement, 
  getAllAnnouncements, 
  createAnnouncement, 
  updateAnnouncement,
  deleteAnnouncement 
} from '../controllers/announcement.controller';

const router = Router();

router.get('/active', getActiveAnnouncement);

router.get('/', authenticateJWT, requireRole(['ADMIN']), getAllAnnouncements);
router.post('/', authenticateJWT, requireRole(['ADMIN']), createAnnouncement);
router.put('/:id', authenticateJWT, requireRole(['ADMIN']), updateAnnouncement);
router.delete('/:id', authenticateJWT, requireRole(['ADMIN']), deleteAnnouncement);

export default router;