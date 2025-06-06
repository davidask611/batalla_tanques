const lienzo = document.getElementById('lienzoJuego');
const contexto = lienzo.getContext('2d');
const barraNivel = document.getElementById('infoNivel');
const barraEnemigos = document.getElementById('infoEnemigos');
const barraRestantes = document.getElementById('infoRestantes');
const barraVidas = document.getElementById('infoVidas');

const COLUMNAS_MAPA = 16, FILAS_MAPA = 16;
let TAM_CELDA = 40; // Se ajustará dinámicamente
let mapa = [];
let paredes = [];
let tanquesEnemigos = [];
let nivel = 1;

const VIDAS_JUGADOR_MAX = 3;

const TIPOS_PARED = {
    ladrillo: { color: '#C1440E', vida: 2, destructible: true },
    metal: { color: '#888', vida: 6, destructible: true },
    agua: { color: '#2176AE', vida: 9999, destructible: false },
    arbusto: { color: '#3E8914', vida: 1, destructible: false }
};

const imagenTanqueUsuario = new Image();
imagenTanqueUsuario.src = 'img/t_usuario.png';
const imagenTanqueEnemigo = new Image();
imagenTanqueEnemigo.src = 'img/t_enemigo.png';
const imagenAguila = new Image();
imagenAguila.src = 'img/aguila.png';

function redimensionarLienzo() {
    let altoHeader = document.getElementById('barraHeader').offsetHeight || 24;
    // Calcular el tamaño de celda máximo que quepa en la ventana
    const anchoDisponible = window.innerWidth;
    const altoDisponible = window.innerHeight - altoHeader;
    TAM_CELDA = Math.floor(Math.min(anchoDisponible / COLUMNAS_MAPA, altoDisponible / FILAS_MAPA));
    lienzo.width = TAM_CELDA * COLUMNAS_MAPA;
    lienzo.height = TAM_CELDA * FILAS_MAPA;
    lienzo.style.top = altoHeader + 'px';
}
redimensionarLienzo();
window.addEventListener('resize', () => {
    redimensionarLienzo();
    crearMapa();
    colocarEntidades();
});

function colisionRectangulo(a, b) {
    return (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y);
}

function crearMapa() {
    mapa = [];
    paredes = [];
    for(let f=0; f<FILAS_MAPA; f++) {
        let fila = [];
        for(let c=0; c<COLUMNAS_MAPA; c++) {
            if(f === 0 || f === FILAS_MAPA-1 || c === 0 || c === COLUMNAS_MAPA-1) {
                fila.push('metal');
                paredes.push({ tipo: 'metal', x: c*TAM_CELDA, y: f*TAM_CELDA, w: TAM_CELDA, h: TAM_CELDA, vida: TIPOS_PARED['metal'].vida });
            }
            else if(f === FILAS_MAPA-3 && (c === Math.floor(COLUMNAS_MAPA/2)-1 || c === Math.floor(COLUMNAS_MAPA/2)+1)) {
                fila.push('ladrillo');
                paredes.push({ tipo: 'ladrillo', x: c*TAM_CELDA, y: f*TAM_CELDA, w: TAM_CELDA, h: TAM_CELDA, vida: TIPOS_PARED['ladrillo'].vida });
            }
            else if(f === FILAS_MAPA-2 && (c >= Math.floor(COLUMNAS_MAPA/2)-1 && c <= Math.floor(COLUMNAS_MAPA/2)+1)) {
                fila.push('ladrillo');
                paredes.push({ tipo: 'ladrillo', x: c*TAM_CELDA, y: f*TAM_CELDA, w: TAM_CELDA, h: TAM_CELDA, vida: TIPOS_PARED['ladrillo'].vida });
            }
            else if(Math.random() < 0.06) {
                fila.push('metal');
                paredes.push({ tipo: 'metal', x: c*TAM_CELDA, y: f*TAM_CELDA, w: TAM_CELDA, h: TAM_CELDA, vida: TIPOS_PARED['metal'].vida });
            }
            else if(Math.random() < 0.12) {
                fila.push('ladrillo');
                paredes.push({ tipo: 'ladrillo', x: c*TAM_CELDA, y: f*TAM_CELDA, w: TAM_CELDA, h: TAM_CELDA, vida: TIPOS_PARED['ladrillo'].vida });
            }
            else if(Math.random() < 0.10) {
                fila.push('agua');
            }
            else {
                fila.push(null);
            }
        }
        mapa.push(fila);
    }
}

let jugador, aguila;
let enemigosNivel = 0;
function colocarEntidades() {
    aguila = {
        x: Math.floor(COLUMNAS_MAPA/2)*TAM_CELDA,
        y: (FILAS_MAPA-1)*TAM_CELDA,
        w: TAM_CELDA, h: TAM_CELDA,
        viva: true
    };
    jugador = new Tanque(TAM_CELDA*7, TAM_CELDA*(FILAS_MAPA-4), 'usuario', true);
    generarEnemigos();
}

class Tanque {
    constructor(x, y, tipo, esUsuario) {
        this.x = x;
        this.y = y;
        this.w = TAM_CELDA;
        this.h = TAM_CELDA;
        this.tipo = tipo;
        this.esUsuario = esUsuario;
        this.direccion = 'U';
        this.velocidad = esUsuario ? Math.max(2, Math.floor(TAM_CELDA/20)*2) : 1.5 + (nivel-1)*0.4;
        this.vida = esUsuario ? VIDAS_JUGADOR_MAX : 1;
        this.disparos = [];
        this.tiempoDisparo = 0;
    }
    obtenerRectangulo(dx=0, dy=0) {
        return {x: this.x+dx, y: this.y+dy, w: this.w, h: this.h};
    }
    puedeMover(dx, dy) {
        let nx = this.x + dx*this.velocidad, ny = this.y + dy*this.velocidad;
        if(nx < 0 || ny < 0 || nx+this.w > lienzo.width || ny+this.h > lienzo.height) return false;
        for(const pared of paredes) {
            if(colisionRectangulo({x:nx,y:ny,w:this.w,h:this.h}, pared)) return false;
        }
        if(aguila.viva && colisionRectangulo({x:nx,y:ny,w:this.w,h:this.h}, aguila)) return false;
        for(const tanque of tanquesEnemigos.concat([jugador])) {
            if(tanque !== this && colisionRectangulo({x:nx,y:ny,w:this.w,h:this.h}, tanque)) return false;
        }
        return true;
    }
    mover(dx, dy) {
        if(this.puedeMover(dx, dy)) {
            this.x += dx*this.velocidad;
            this.y += dy*this.velocidad;
        }
    }
    disparar() {
        if (this.tiempoDisparo <= 0) {
            let px = this.x + this.w/2 - 4;
            let py = this.y + this.h/2 - 4;
            if(this.direccion==='U') py -= this.h/2;
            if(this.direccion==='D') py += this.h/2;
            if(this.direccion==='L') px -= this.w/2;
            if(this.direccion==='R') px += this.w/2;
            this.disparos.push({
                x: px, y: py, direccion: this.direccion, velocidad: Math.max(4, Math.floor(TAM_CELDA/10)), w: 8, h: 8
            });
            this.tiempoDisparo = 30;
        }
    }
    actualizarDisparos() {
        this.disparos.forEach(d => {
            if (d.direccion === 'U') d.y -= d.velocidad;
            if (d.direccion === 'D') d.y += d.velocidad;
            if (d.direccion === 'L') d.x -= d.velocidad;
            if (d.direccion === 'R') d.x += d.velocidad;
        });
        this.disparos = this.disparos.filter(d =>
            d.x >= 0 && d.x <= lienzo.width && d.y >= 0 && d.y <= lienzo.height
        );
        if (this.tiempoDisparo > 0) this.tiempoDisparo--;
    }
    dibujar() {
        let imagen = this.esUsuario ? imagenTanqueUsuario : imagenTanqueEnemigo;
        contexto.save();
        contexto.translate(this.x + this.w/2, this.y + this.h/2);
        let angulo = { 'U':0, 'R':Math.PI/2, 'D':Math.PI, 'L':-Math.PI/2 }[this.direccion];
        contexto.rotate(angulo);
        contexto.drawImage(imagen, -this.w/2, -this.h/2, this.w, this.h);
        contexto.restore();
    }
}

function generarEnemigos() {
    tanquesEnemigos = [];
    enemigosNivel = nivel + 1;
    for (let i = 0; i < enemigosNivel; i++) {
        let enemigo = new Tanque(TAM_CELDA + i*TAM_CELDA*2, TAM_CELDA, 'enemigo', false);
        enemigo.velocidad = 1 + nivel * 0.4;
        tanquesEnemigos.push(enemigo);
    }
}

const teclas = {};
window.addEventListener('keydown', (evento) => { teclas[evento.key] = true; });
window.addEventListener('keyup', (evento) => { teclas[evento.key] = false; });

function bucleJuego() {
    contexto.clearRect(0, 0, lienzo.width, lienzo.height);

    barraNivel.textContent = "Nivel: " + nivel;
    barraEnemigos.textContent = "Enemigos: " + enemigosNivel;
    barraRestantes.textContent = "Restantes: " + tanquesEnemigos.length + " / " + enemigosNivel;
    barraVidas.textContent = "Vidas: " + jugador.vida;

    for (let f=0; f<mapa.length; f++)
        for (let c=0; c<mapa[f].length; c++) {
            if(mapa[f][c] && (mapa[f][c]==='agua' || mapa[f][c]==='arbusto')) {
                contexto.fillStyle = TIPOS_PARED[mapa[f][c]].color;
                contexto.fillRect(c*TAM_CELDA, f*TAM_CELDA, TAM_CELDA, TAM_CELDA);
            }
        }

    for(const pared of paredes) {
        contexto.fillStyle = TIPOS_PARED[pared.tipo].color;
        contexto.fillRect(pared.x, pared.y, pared.w, pared.h);
    }

    if (aguila.viva) {
        contexto.drawImage(imagenAguila, aguila.x, aguila.y, aguila.w, aguila.h);
        contexto.strokeStyle = "#FFD700";
        contexto.strokeRect(aguila.x, aguila.y, aguila.w, aguila.h);
    }

    if (teclas['ArrowUp'])    { jugador.direccion = 'U'; jugador.mover(0,-1);}
    if (teclas['ArrowDown'])  { jugador.direccion = 'D'; jugador.mover(0,1);}
    if (teclas['ArrowLeft'])  { jugador.direccion = 'L'; jugador.mover(-1,0);}
    if (teclas['ArrowRight']) { jugador.direccion = 'R'; jugador.mover(1,0);}
    if (teclas[' ']) jugador.disparar();

    jugador.dibujar();
    jugador.actualizarDisparos();

    tanquesEnemigos.forEach(enemigo => {
        if (Math.abs(enemigo.x - jugador.x) > Math.abs(enemigo.y - jugador.y)) {
            enemigo.direccion = (enemigo.x < jugador.x) ? 'R' : 'L';
            enemigo.mover((enemigo.x < jugador.x)?1:-1,0);
        } else {
            enemigo.direccion = (enemigo.y < jugador.y) ? 'D' : 'U';
            enemigo.mover(0,(enemigo.y < jugador.y)?1:-1);
        }
        if (Math.abs(enemigo.x - jugador.x) < 10 || Math.abs(enemigo.y - jugador.y) < 10) enemigo.disparar();
        enemigo.dibujar();
        enemigo.actualizarDisparos();
    });

    jugador.disparos.forEach(d => {
        contexto.fillStyle = "#FFF";
        contexto.fillRect(d.x, d.y, d.w, d.h);
    });
    tanquesEnemigos.forEach(enemigo => {
        enemigo.disparos.forEach(d => {
            contexto.fillStyle = "#FF4444";
            contexto.fillRect(d.x, d.y, d.w, d.h);
        });
    });

    jugador.disparos = jugador.disparos.filter(d => {
        for(const pared of paredes) {
            if(colisionRectangulo(d, pared)) {
                if(TIPOS_PARED[pared.tipo].destructible) {
                    pared.vida--;
                    if(pared.vida <= 0) paredes.splice(paredes.indexOf(pared), 1);
                }
                return false;
            }
        }
        for(const enemigo of tanquesEnemigos) {
            if(colisionRectangulo(d, enemigo)) {
                tanquesEnemigos.splice(tanquesEnemigos.indexOf(enemigo),1);
                return false;
            }
        }
        if(aguila.viva && colisionRectangulo(d, aguila)) {
            aguila.viva = false;
            return false;
        }
        return true;
    });

    tanquesEnemigos.forEach(enemigo => {
        enemigo.disparos = enemigo.disparos.filter(d => {
            for(const pared of paredes) {
                if(colisionRectangulo(d, pared)) {
                    if(TIPOS_PARED[pared.tipo].destructible) {
                        pared.vida--;
                        if(pared.vida <= 0) paredes.splice(paredes.indexOf(pared), 1);
                    }
                    return false;
                }
            }
            if(colisionRectangulo(d, jugador)) {
                jugador.vida--;
                if (jugador.vida <= 0) {
                    jugador.vida = VIDAS_JUGADOR_MAX;
                    colocarEntidades();
                    crearMapa();
                    return false;
                }
                jugador.x = TAM_CELDA*7;
                jugador.y = TAM_CELDA*(FILAS_MAPA-4);
                return false;
            }
            if(aguila.viva && colisionRectangulo(d, aguila)) {
                aguila.viva = false;
                return false;
            }
            return true;
        });
    });

    if(tanquesEnemigos.length === 0) {
        nivel++;
        crearMapa();
        colocarEntidades();
    }

    if(!aguila.viva) {
        nivel = 1;
        crearMapa();
        colocarEntidades();
    }

    requestAnimationFrame(bucleJuego);
}

crearMapa();
colocarEntidades();
bucleJuego();