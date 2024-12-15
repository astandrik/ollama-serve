# Ollama Serve

A web interface for Ollama with CUDA support.

## Prerequisites

- Docker
- Docker Compose
- NVIDIA GPU with installed drivers
- NVIDIA Container Toolkit (nvidia-docker)

## Installation

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

2. Clone the repository:

```bash
git clone <repository-url>
cd ollama-serve
```

3. Build and start the containers:

```bash
docker compose up --build
```

The application will be available at:

- Web Interface: http://localhost
- Server API: http://localhost:3000
- Ollama API: http://localhost:11434

## Architecture

The application consists of three main components:

1. **Client**: React/TypeScript frontend served by Nginx
2. **Server**: Node.js/Express backend that manages Ollama
3. **Ollama**: AI model server with CUDA support

## Development

To run the application in development mode:

1. Start the containers:

```bash
docker compose up
```

2. Make changes to the code - the containers will automatically reload with your changes.

## GPU Support

The application is configured to use all available NVIDIA GPUs through Docker. GPU utilization can be monitored through the web interface's metrics page.

## Volumes

- Ollama models and data are persisted in a Docker volume named `ollama_data`

## Ports

- 80: Web Interface (Client)
- 3000: Backend API (Server)
- 11434: Ollama API

## Troubleshooting

1. Verify NVIDIA drivers and Docker integration:

```bash
nvidia-smi
docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi
```

2. Check container logs:

```bash
docker compose logs -f
```

3. If Ollama is not detecting the GPU, ensure the NVIDIA Container Toolkit is properly installed and Docker service has been restarted.
