cd C:\Progamacion\tiempos\frontend
echo FROM node:20-alpine > Dockerfile
echo WORKDIR /app >> Dockerfile
echo COPY package*.json ./ >> Dockerfile
echo RUN npm install >> Dockerfile
echo COPY . . >> Dockerfile
echo RUN npm run build >> Dockerfile
echo FROM node:20-alpine >> Dockerfile
echo WORKDIR /app >> Dockerfile
echo ENV NODE_ENV=production >> Dockerfile
echo COPY --from=builder /app/.next ./.next >> Dockerfile
echo COPY --from=builder /app/package*.json ./ >> Dockerfile
echo COPY --from=builder /app/node_modules ./node_modules >> Dockerfile
echo EXPOSE 3000 >> Dockerfile
echo CMD ["npm", "start"] >> Dockerfile