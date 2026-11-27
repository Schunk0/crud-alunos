
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = "65fd675f3a0f067d159ad90478ac3d6dc7e7a2ba24b48230f05888ab106e165f";

function authenticateJWT(req, res, next) {
    const authHeader = req.header('Authorization');

    let token;

    if (authHeader) {
        const parts = authHeader.split(' ');
        if (parts.length === 2) {
            token = parts[1];
        }
    }

    if (!token) {
        return res.status(401).send({ message: "Acesso negado. Token não fornecido." });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).send({ message: "Acesso negado. Token expirado." });
            } else if (err.name === 'JsonWebTokenError') {
                return res.status(403).send({ message: "Acesso negado. Token inválido." });
            } else {
                return res.status(403).send({ message: "Acesso negado. Erro na verificação do token." });
            }
        }
        req.user = user;

        next();
    });
}


let alunos = [
    {
        id: 1,
        nome: "Pedro Henrique Rocha Melo",
        ra: "SC202601",
        nota1: 8.0,
        nota2: 7.5
    },
    {
        id: 2,
        nome: "Rafael Schunk",
        ra: "SC202602",
        nota1: 5.0,
        nota2: 4.5
    },
    {
        id: 3,
        nome: "Amora Maria",
        ra: "SC202603",
        nota1: 6.0,
        nota2: 6.0
    }
];

function dadosValidos(nome, ra, nota1, nota2) {
    return typeof nome === "string" && typeof ra === "string" && typeof nota1 === "number" && nota1 >= 0 && nota1 <= 10 &&
        typeof nota2 === "number" && nota2 >= 0 && nota2 <= 10;
}

let usuarios = [];

const app = express();

app.use(express.json());


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


app.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        const usuario = usuarios.find(usuario => usuario.username === username);

        if (!usuario || !(await bcrypt.compare(password, usuario.password))) {
            return res.status(401).json({
                message: "Usuário ou senha incorretos!"
            });
        }

        const token = jwt.sign(
            { username: usuario.username },
            JWT_SECRET,
            { expiresIn: "1h", algorithm: 'HS256' }
        );

        return res.status(200).json({
            message: "Login realizado com sucesso!",
            jwt: token
        });

    } catch (erro) {
        return res.status(500).json({
            message: "Erro ao realizar login!"
        });
    }
});

app.get("/alunos", authenticateJWT, (req, res) => {
    return res.status(200).json(alunos);
});

app.get("/alunos/medias", authenticateJWT, (req, res) => {
    const medias = alunos.map(aluno => ({
            nome: aluno.nome,
            media: (aluno.nota1 + aluno.nota2) / 2
        }));

    return res.status(200).json(medias);
});

app.get("/alunos/aprovados", authenticateJWT, (req, res) => {
    const aprovados = alunos.map(aluno => {
        const media = (aluno.nota1 + aluno.nota2) / 2;

        return {
            nome: aluno.nome,
            status: media >= 6 ? "aprovado" : "reprovado"
        };
    });

    return res.status(200).json(aprovados);
});


app.get("/alunos/:id", authenticateJWT, (req, res) => {
    const id = Number(req.params.id);

    const aluno = alunos.find(aluno => aluno.id === id);

    if (!aluno) {
        return res.status(404).json({
            message: "Aluno não encontrado!"
        });
    }

    return res.status(200).json(aluno);
});


app.post("/alunos", authenticateJWT, (req, res) => {
    const { id, nome, ra, nota1, nota2 } = req.body;

    if (id === undefined || !dadosValidos(nome,ra,nota1,nota2)) {
        return res.status(400).json({
            message: "Dados inválidos!"
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

    return res.status(201).json({ message: "Aluno criado com sucesso!" });
});


app.put("/alunos/:id", authenticateJWT, (req, res) => {
    const id = Number(req.params.id);

    const indexAluno = alunos.findIndex(aluno => aluno.id === id);

    if (indexAluno === -1) {
        return res.status(404).json({
            message: "Aluno não encontrado!"
        });
    }

    const { nome, ra, nota1, nota2 } = req.body;

     if (!dadosValidos(nome,ra,nota1,nota2)) {
        return res.status(400).json({
            message: "Dados inválidos!"
        });
    }

    alunos[indexAluno] = {
        id: Number(id),
        nome,
        ra,
        nota1: Number(nota1),
        nota2: Number(nota2)
    }

    return res.status(200).json({ message: "Aluno atualizado com sucesso!" });
});


app.delete("/alunos/:id", authenticateJWT, (req, res) => {
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

export default app;