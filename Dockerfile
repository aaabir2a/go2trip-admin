# -------- Build stage --------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# -------- Production stage --------
FROM nginx:alpine

# remove default nginx config
RUN rm -rf /usr/share/nginx/html/*

# copy build files
COPY --from=builder /app/dist /usr/share/nginx/html

# copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]