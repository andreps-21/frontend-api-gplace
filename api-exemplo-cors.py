# Exemplo prático de configuração CORS para FastAPI

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn

app = FastAPI(title="TIM API", version="1.0.0")

# Configuração CORS - ESSENCIAL para funcionar com o frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Frontend padrão Next.js
        "http://localhost:3001",  # Seu frontend atual
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://192.168.0.87:3000",  # IP da rede local
        "http://192.168.0.87:3001",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Modelos de dados
class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    user: dict
    token: str
    message: str

class User(BaseModel):
    id: int
    name: str
    email: str
    is_active: bool

# Rotas da API
@app.get("/api/v1/auth/profile")
async def get_profile():
    """Endpoint para obter perfil do usuário"""
    return {
        "message": "Perfil obtido com sucesso",
        "data": {
            "id": 1,
            "name": "Usuário Teste",
            "email": "teste@tim.com",
            "is_active": True
        }
    }

@app.post("/api/v1/auth/login")
async def login(login_data: LoginRequest):
    """Endpoint para login"""
    # Simulação de validação
    if login_data.email == "admin@tim.com" and login_data.password == "123456":
        return {
            "message": "Login realizado com sucesso",
            "data": {
                "user": {
                    "id": 1,
                    "name": "Administrador",
                    "email": "admin@tim.com",
                    "is_active": True
                },
                "token": "fake-jwt-token-123456"
            }
        }
    else:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

@app.get("/api/v1/users")
async def get_users():
    """Endpoint para listar usuários"""
    return {
        "message": "Usuários obtidos com sucesso",
        "data": [
            {
                "id": 1,
                "name": "João Silva",
                "email": "joao@tim.com",
                "is_active": True
            },
            {
                "id": 2,
                "name": "Maria Santos",
                "email": "maria@tim.com",
                "is_active": True
            }
        ]
    }

@app.get("/")
async def root():
    """Endpoint raiz"""
    return {
        "message": "TIM API está funcionando!",
        "version": "1.0.0",
        "cors": "Configurado para localhost:3000 e localhost:3001"
    }

# Executar servidor
if __name__ == "__main__":
    print("🚀 Iniciando TIM API...")
    print("📡 Servidor rodando em: http://localhost:8000")
    print("🔗 Frontend deve estar em: http://localhost:3001")
    print("🔧 CORS configurado para localhost:3000 e localhost:3001")
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        log_level="info"
    )
