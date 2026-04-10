-- 🧹 LIMPIEZA DE HORARIOS NICA INCORRECTOS
-- Solo deben quedar: 12:00, 15:00, 18:00, 21:00

-- 1. Eliminar sorteos de NICA con horarios que no sean los oficiales
DELETE FROM draws 
WHERE lottery_type = 'NICA' 
AND draw_time NOT IN ('12:00:00', '15:00:00', '18:00:00', '21:00:00');

-- 2. Eliminar sorteos duplicados (si los hay por zona horaria mal calculada antes)
DELETE FROM draws d1
USING draws d2
WHERE d1.id > d2.id
AND d1.lottery_type = d2.lottery_type
AND d1.draw_date = d2.draw_date
AND d1.draw_time = d2.draw_time;

-- 3. Verificar estado actual
SELECT lottery_type, draw_date, draw_time, status 
FROM draws 
WHERE lottery_type = 'NICA' 
ORDER BY draw_date DESC, draw_time DESC 
LIMIT 20;

-- 4. Verificar horarios únicos restantes para NICA
SELECT DISTINCT draw_time 
FROM draws 
WHERE lottery_type = 'NICA' 
ORDER BY draw_time;
