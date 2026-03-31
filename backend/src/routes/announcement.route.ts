import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middlewares/auth.middleware';
import { 
  getActiveAnnouncement, 
  getAllAnnouncements, 
  createAnnouncement, 
  deleteAnnouncement 
} from '../controllers/announcement.controller';

const router = Router();

// Ruta pública para obtener anuncio activo
router.get('/active', getActiveAnnouncement);

// Rutas protegidas para admin
router.get('/', authenticateJWT, requireRole(['ADMIN']), getAllAnnouncements);
router.post('/', authenticateJWT, requireRole(['ADMIN']), createAnnouncement);
router.delete('/:id', authenticateJWT, requireRole(['ADMIN']), deleteAnnouncement);

export default router;