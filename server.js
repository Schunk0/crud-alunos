
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET não foi configurado no arquivo .env");
}

app.use(express.json());


// --------------------------------------------------
// ROTA INICIAL
// --------------------------------------------------

app.get("/", (req, res) => {
    res.status(200).json({
        message: "API de alunos funcionando!",
        rotas: [
            "/register",
            "/login",
            "/alunos",
            "/alunos/medias",
            "/alunos/aprovados"
        ]
    });
});

// --------------------------------------------------
// DADOS INICIAIS
// --------------------------------------------------

let alunos = [
    {
        id: 1,
        nome: "Ana Silva",
        ra: "2024001",
        nota1: 8.0,
        nota2: 7.5
    },
    {
        id: 2,
        nome: "Bruno Souza",
        ra: "2024002",
        nota1: 5.0,
        nota2: 4.5
    },
    {
        id: 3,
        nome: "Carla Oliveira",
        ra: "2024003",
        nota1: 6.0,
        nota2: 6.0
    }
];

let usuarios = [];

// --------------------------------------------------
// MIDDLEWARE JWT
// --------------------------------------------------

function autenticarToken(req, res, next) {
    const authorization = req.headers.authorization;

    if (!authorization) {
        return res.status(401).json({
            message: "Token não fornecido!"
        });
    }

    const partes = authorization.split(" ");
    const token = partes[1];

    if (partes[0] !== "Bearer" || !token) {
        return res.status(401).json({
            message: "Formato do token inválido!"
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (erro, usuario) => {
        if (erro) {
            return res.status(403).json({
                message: "Token inválido ou expirado!"
            });
        }

        req.usuario = usuario;
        next();
    });
}

// --------------------------------------------------
// POST /register
// --------------------------------------------------

app.post("/register", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                message: "Informe username e password!"
            });
        }

        const usuarioExiste = usuarios.find(
            usuario => usuario.username === username
        );

        if (usuarioExiste) {
            return res.status(409).json({
                message: "Usuário já cadastrado!"
            });
        }

        const senhaCriptografada = await bcrypt.hash(password, 10);

        usuarios.push({
            username,
            password: senhaCriptografada
        });

        return res.status(201).json({
            message: "Usuário cadastrado com sucesso!"
        });

    } catch (erro) {
        return res.status(500).json({
            message: "Erro ao cadastrar usuário!"
        });
    }
});

// --------------------------------------------------
// POST /login
// --------------------------------------------------

app.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        const usuario = usuarios.find(
            usuario => usuario.username === username
        );

        if (!usuario) {
            return res.status(401).json({
                message: "Usuário ou senha incorretos!"
            });
        }

        const senhaCorreta = await bcrypt.compare(
            password,
            usuario.password
        );

        if (!senhaCorreta) {
            return res.status(401).json({
                message: "Usuário ou senha incorretos!"
            });
        }

        const token = jwt.sign(
            { username: usuario.username },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        return res.status(200).json({
            message: "Login realizado com sucesso!",
            token
        });

    } catch (erro) {
        return res.status(500).json({
            message: "Erro ao realizar login!"
        });
    }
});

// --------------------------------------------------
// GET /alunos
// --------------------------------------------------

app.get("/alunos", autenticarToken, (req, res) => {
    return res.status(200).json(alunos);
});

// --------------------------------------------------
// GET /alunos/medias
// --------------------------------------------------

app.get("/alunos/medias", autenticarToken, (req, res) => {
    const medias = alunos.map(aluno => {
        const media = (aluno.nota1 + aluno.nota2) / 2;

        return {
            nome: aluno.nome,
            media
        };
    });

    return res.status(200).json(medias);
});

// --------------------------------------------------
// GET /alunos/aprovados
// --------------------------------------------------

app.get("/alunos/aprovados", autenticarToken, (req, res) => {
    const aprovados = alunos.map(aluno => {
        const media = (aluno.nota1 + aluno.nota2) / 2;

        return {
            nome: aluno.nome,
            status: media >= 6 ? "aprovado" : "reprovado"
        };
    });

    return res.status(200).json(aprovados);
});

// --------------------------------------------------
// GET /alunos/:id
// --------------------------------------------------

app.get("/alunos/:id", autenticarToken, (req, res) => {
    const id = Number(req.params.id);

    const aluno = alunos.find(aluno => aluno.id === id);

    if (!aluno) {
        return res.status(404).json({
            message: "Aluno não encontrado!"
        });
    }

    return res.status(200).json(aluno);
});

// --------------------------------------------------
// POST /alunos
// --------------------------------------------------

app.post("/alunos", autenticarToken, (req, res) => {
    const { id, nome, ra, nota1, nota2 } = req.body;

    if (
        id === undefined ||
        !nome ||
        !ra ||
        nota1 === undefined ||
        nota2 === undefined
    ) {
        return res.status(400).json({
            message: "Informe id, nome, ra, nota1 e nota2!"
        });
    }

    const valores = [Number(id), Number(nota1), Number(nota2)];

    if (valores.some(valor => !Number.isFinite(valor))) {
        return res.status(400).json({
            message: "ID e notas devem ser números válidos!"
        });
    }

    const idExiste = alunos.find(aluno => aluno.id === Number(id));

    if (idExiste) {
        return res.status(409).json({
            message: "Já existe um aluno com esse ID!"
        });
    }

    const novoAluno = {
        id: Number(id),
        nome,
        ra,
        nota1: Number(nota1),
        nota2: Number(nota2)
    };

    alunos.push(novoAluno);

    return res.status(201).json(novoAluno);
});

// --------------------------------------------------
// PUT /alunos/:id
// --------------------------------------------------

app.put("/alunos/:id", autenticarToken, (req, res) => {
    const id = Number(req.params.id);

    const aluno = alunos.find(aluno => aluno.id === id);

    if (!aluno) {
        return res.status(404).json({
            message: "Aluno não encontrado!"
        });
    }

    const { nome, ra, nota1, nota2 } = req.body;

    if (nota1 !== undefined && !Number.isFinite(Number(nota1))) {
        return res.status(400).json({
            message: "Nota 1 inválida!"
        });
    }

    if (nota2 !== undefined && !Number.isFinite(Number(nota2))) {
        return res.status(400).json({
            message: "Nota 2 inválida!"
        });
    }

    if (nome !== undefined) aluno.nome = nome;
    if (ra !== undefined) aluno.ra = ra;
    if (nota1 !== undefined) aluno.nota1 = Number(nota1);
    if (nota2 !== undefined) aluno.nota2 = Number(nota2);

    return res.status(200).json(aluno);
});

// --------------------------------------------------
// DELETE /alunos/:id
// --------------------------------------------------

app.delete("/alunos/:id", autenticarToken, (req, res) => {
    const id = Number(req.params.id);

    const indice = alunos.findIndex(aluno => aluno.id === id);

    if (indice === -1) {
        return res.status(404).json({
            message: "Aluno não encontrado!"
        });
    }

    alunos.splice(indice, 1);

    return res.status(200).json({
        message: "Aluno excluído com sucesso!"
    });
});

// --------------------------------------------------
// INICIALIZAÇÃO
// --------------------------------------------------

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
