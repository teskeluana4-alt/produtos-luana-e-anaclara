const express = require('express');
const router = express.Router();
const config = require('../configImagens');
const {login,logout,requireUser}=require('../auth');

router.get('/', (req, res) => {
    if(req.auth) return res.redirect('/home');
    res.render('login', { config });
});

router.get('/home', requireUser, (req, res) => {
    const { uva, ano, regiao, estoque } = req.query;
    const userEmail = req.auth.email;

    let query = "SELECT * FROM produtos WHERE 1=1";
    let params = [];

    if (uva) {
        query += " AND uva LIKE ?";
        params.push(`%${uva}%`);
    }
    if (ano) {
        query += " AND ano = ?";
        params.push(ano);
    }
    if (regiao) {
        query += " AND regiao LIKE ?";
        params.push(`%${regiao}%`);
    }
    if (estoque === 'disponivel') {
        query += " AND estoque > 0";
    } else if (estoque === 'esgotado') {
        query += " AND estoque <= 0";
    }

    req.db.get("SELECT * FROM usuarios WHERE email = ?", [userEmail], (err, usuario) => {
        req.db.all("SELECT DISTINCT uva FROM produtos", [], (err, uvas) => {
            req.db.all("SELECT DISTINCT ano FROM produtos ORDER BY ano DESC", [], (err, anos) => {
                req.db.all("SELECT DISTINCT regiao FROM produtos", [], (err, regiaoList) => {
                    req.db.all(query, params, (err, produtos) => {
                        req.db.all("SELECT * FROM produtos LIMIT 3", [], (err, vinhosDoMes) => {
                            res.render('index', { 
                                usuario: usuario || {nome:req.auth.name,perfil:'cliente'}, 
                                produtos: produtos || [],
                                vinhosDoMes: vinhosDoMes || [],
                                uvas: uvas || [],
                                anos: anos || [],
                                regioes: regiaoList || [],
                                filtros: { uva: uva || '', ano: ano || '', regiao: regiao || '', estoque: estoque || '' },
                                config
                            });
                        });
                    });
                });
            });
        });
    });
});

router.post('/login', (req,res)=>{
    const email=String(req.body.email||'').trim();const senha=String(req.body.senha||'');
    req.db.get(`SELECT * FROM usuarios WHERE (email=? OR nome=?) AND senha=? AND perfil='cliente'`,[email,email,senha],(err,user)=>{
      if(err||!user)return res.status(401).send('<meta charset="utf-8"><script>alert("Usuário ou senha incorretos!");window.location.href="/";</script>');
      login(res,{email:user.email,role:'cliente',name:user.nome});res.redirect('/home');
    });
});
router.post('/register',(req,res)=>{
    const {nome,email,senha}=req.body;
    if(!nome||!email||!senha)return res.status(400).send('Dados obrigatorios ausentes.');
    req.db.run(`INSERT INTO usuarios (nome,email,senha,perfil) VALUES (?,?,?,'cliente')`,[nome,email,senha],err=>{
      if(err)return res.status(400).send('<meta charset="utf-8"><script>alert("Não foi possível criar a conta. Verifique o e-mail.");window.history.back();</script>');
      res.redirect('/');
    });
});
router.get('/logout',(req,res)=>{logout(req,res);res.redirect('/');});
router.post('/logout',(req,res)=>{logout(req,res);res.redirect('/');});

module.exports = router;
