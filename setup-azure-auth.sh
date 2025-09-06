# Azure Service Principal Setup Script
# Run these commands in Azure CLI or Azure Cloud Shell

# 1. Get your subscription ID
az account show --query id --output tsv

# 2. Create a service principal for GitHub Actions
# Replace <subscription-id> with the ID from step 1
az ad sp create-for-rbac --name "github-actions-dangunland" --role contributor --scopes /subscriptions/<subscription-id>/resourceGroups/<your-resource-group>/providers/Microsoft.Web/sites/dangunland --sdk-auth

# 3. The command above will output JSON like this:
# {
#   "clientId": "xxxx-xxxx-xxxx-xxxx",
#   "clientSecret": "xxxx-xxxx-xxxx-xxxx", 
#   "subscriptionId": "xxxx-xxxx-xxxx-xxxx",
#   "tenantId": "xxxx-xxxx-xxxx-xxxx"
# }

# 4. You'll use these values in the next step
