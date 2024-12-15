# Ollama Serve

A web interface for Ollama with CUDA support, packaged as a single Docker image.

## Prerequisites

- Docker
- NVIDIA GPU with installed drivers
- NVIDIA Container Toolkit (nvidia-docker)

## Quick Start

Pull and run the image:

```bash
docker run -d \
  --gpus all \
  -p 80:80 \
  -p 3000:3000 \
  -p 11434:11434 \
  -v ollama_data:/root/.ollama \
  [your-docker-registry]/ollama-serve
```

The application will be available at:

- Web Interface: http://localhost
- Server API: http://localhost:3000
- Ollama API: http://localhost:11434

## Building the Image

If you want to build the image yourself:

```bash
# Build the image
docker build -t ollama-serve .

# Run the container
docker run -d \
  --gpus all \
  -p 80:80 \
  -p 3000:3000 \
  -p 11434:11434 \
  -v ollama_data:/root/.ollama \
  ollama-serve
```

## Architecture

The application runs as a single container with three main components:

1. **Client**: React/TypeScript frontend served by Nginx on port 80
2. **Server**: Node.js/Express backend on port 3000
3. **Ollama**: AI model server with CUDA support on port 11434

## GPU Support

The container is configured to use NVIDIA GPUs through the NVIDIA Container Toolkit. To verify GPU support:

1. Install NVIDIA Container Toolkit if not already installed:

```bash
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

2. Verify NVIDIA drivers and Docker integration:

```bash
nvidia-smi
docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi
```

## Data Persistence

Ollama models and data are persisted in a Docker volume named `ollama_data`. This ensures your models are preserved between container restarts.

## Troubleshooting

1. Check container logs:

```bash
docker logs [container-id]
```

2. If GPU is not detected:

- Verify NVIDIA Container Toolkit installation
- Ensure the `--gpus all` flag is used when running the container
- Check NVIDIA driver installation with `nvidia-smi`

3. Access individual service logs inside the container:

```bash
# Nginx logs
docker exec [container-id] tail -f /var/log/nginx/error.log

# Server logs
docker exec [container-id] tail -f /app/server/logs/server.log

# Ollama logs
docker exec [container-id] tail -f /root/.ollama/logs/ollama.log
```
