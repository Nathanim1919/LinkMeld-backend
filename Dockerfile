# Dockerfile

FROM node:22


# Create app directory
WORKDIR /app



# Install app dependencies
COPY package*.json ./
RUN npm install



# Copy all source files
COPY . .


# Default command can be overridden
CMD ["npm", "run", "dev"]
