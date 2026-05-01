# Update Package Index and Install Dependencies
sudo apt update && sudo apt upgrade -y
sudo apt install ca-certificates curl 

# Import Docker’s Official GPG Key:  
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc   

# Add the Docker Repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null   

# Install Docker Engine
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin   

# Add the user to the docker group
sudo usermod -aG docker $USER
newgrp docker

# Clone the Github Repo
git clone https://github.com/elonerajeev/flowsyc.git

# move to wokring directory
cd flowsyc

# build teh docker compose images
docker compose up --build

# # # In another tab do this -> do manually for sefety...
# ocker compose exec backend npx prisma migrate deploy
# docker compose restart backend
