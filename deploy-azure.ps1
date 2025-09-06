# Azure Deployment Script
# Run this in PowerShell after installing Azure CLI

# 1. Login to Azure (if not already logged in)
# az login

# 2. Build the application
npm run build

# 3. Create a zip file for deployment (Windows PowerShell)
Compress-Archive -Path * -DestinationPath deploy.zip -Force

# 4. Deploy to Azure App Service
# Replace 'your-app-name' and 'your-resource-group' with your actual values
# az webapp deployment source config-zip --resource-group your-resource-group --name your-app-name --src deploy.zip

# Alternative: Deploy directly from this directory
# az webapp up --resource-group your-resource-group --name your-app-name --location "East US" --sku FREE
