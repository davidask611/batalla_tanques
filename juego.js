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

// Ajusta este valor para el "margen" de las paredes (en píxeles)
const PARED_OFFSET = 6;

const TIPOS_PARED = {
    ladrillo: { color: '#C1440E', vida: 2, destructible: true },
    metal: { color: '#888', vida: 6, destructible: true },
    agua: { color: '#2176AE', vida: 9999, destructible: false },
    arbusto: { color: '#3E8914', vida: 1, destructible: false }
};

// Cargar imágenes del tanque del jugador
const imagenTanqueUsuarioArriba = new Image();
imagenTanqueUsuarioArriba.src = 'img/tank_ali_arriba.png';
const imagenTanqueUsuarioAbajo = new Image();
imagenTanqueUsuarioAbajo.src = 'img/tank_ali_abajo.png';
const imagenTanqueUsuarioIzquierda = new Image();
imagenTanqueUsuarioIzquierda.src = 'img/tank_ali_izquierda.png';
const imagenTanqueUsuarioDerecha = new Image();
imagenTanqueUsuarioDerecha.src = 'img/tank_ali_derecha.png';

// Cargar imágenes de los tanques enemigos
const imagenTanqueEnemigoArriba = new Image();
imagenTanqueEnemigoArriba.src = 'img/tank_ene_arriba.png';
const imagenTanqueEnemigoAbajo = new Image();
imagenTanqueEnemigoAbajo.src = 'img/tank_ene_abajo.png';
const imagenTanqueEnemigoIzquierda = new Image();
imagenTanqueEnemigoIzquierda.src = 'img/tank_ene_izquierda.png';
const imagenTanqueEnemigoDerecha = new Image();
imagenTanqueEnemigoDerecha.src = 'img/tank_ene_derecha.png';

// Imagen del águila
const imagenAguila = new Image();
imagenAguila.src = 'img/aguila.png';

function redimensionarLienzo() {
    let altoHeader = document.getElementById('barraHeader').offsetHeight || 24;
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
                paredes.push({
                    tipo: 'metal',
                    x: c*TAM_CELDA + PARED_OFFSET/2,
                    y: f*TAM_CELDA + PARED_OFFSET/2,
                    w: TAM_CELDA - PARED_OFFSET,
                    h: TAM_CELDA - PARED_OFFSET,
                    vida: TIPOS_PARED['metal'].vida
                });
            }
            else if(Math.random() < 0.06) {
                fila.push('metal');
                paredes.push({
                    tipo: 'metal',
                    x: c*TAM_CELDA + PARED_OFFSET/2,
                    y: f*TAM_CELDA + PARED_OFFSET/2,
                    w: TAM_CELDA - PARED_OFFSET,
                    h: TAM_CELDA - PARED_OFFSET,
                    vida: TIPOS_PARED['metal'].vida
                });
            }
            else if(Math.random() < 0.12) {
                fila.push('ladrillo');
                paredes.push({
                    tipo: 'ladrillo',
                    x: c*TAM_CELDA + PARED_OFFSET/2,
                    y: f*TAM_CELDA + PARED_OFFSET/2,
                    w: TAM_CELDA - PARED_OFFSET,
                    h: TAM_CELDA - PARED_OFFSET,
                    vida: TIPOS_PARED['ladrillo'].vida
                });
            }
            else if(Math.random() < 0.10) {
                fila.push('agua');
                paredes.push({
                    tipo: 'agua',
                    x: c*TAM_CELDA + PARED_OFFSET/2,
                    y: f*TAM_CELDA + PARED_OFFSET/2,
                    w: TAM_CELDA - PARED_OFFSET,
                    h: TAM_CELDA - PARED_OFFSET,
                    vida: TIPOS_PARED['agua'].vida
                });
            }
            else if(Math.random() < 0.05) {
                fila.push('arbusto');
                paredes.push({
                    tipo: 'arbusto',
                    x: c*TAM_CELDA + PARED_OFFSET/2,
                    y: f*TAM_CELDA + PARED_OFFSET/2,
                    w: TAM_CELDA - PARED_OFFSET,
                    h: TAM_CELDA - PARED_OFFSET,
                    vida: TIPOS_PARED['arbusto'].vida
                });
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
    // Águila al centro exacto del mapa
    const centroCol = Math.floor(COLUMNAS_MAPA / 2);
    const centroFil = Math.floor(FILAS_MAPA / 2);

    aguila = {
        x: centroCol * TAM_CELDA,
        y: centroFil * TAM_CELDA,
        w: TAM_CELDA, h: TAM_CELDA,
        viva: true
    };

    // Rodear el águila de ladrillos (cruz y esquinas)
    let defensas = [
        [centroFil-1, centroCol],     // arriba
        [centroFil+1, centroCol],     // abajo
        [centroFil, centroCol-1],     // izquierda
        [centroFil, centroCol+1],     // derecha
        [centroFil-1, centroCol-1],   // esquina sup-izq
        [centroFil-1, centroCol+1],   // esquina sup-der
        [centroFil+1, centroCol-1],   // esquina inf-izq
        [centroFil+1, centroCol+1],   // esquina inf-der
    ];
    // Limpia defensas anteriores
    paredes = paredes.filter(p => {
        let f = Math.round((p.y - PARED_OFFSET/2) / TAM_CELDA);
        let c = Math.round((p.x - PARED_OFFSET/2) / TAM_CELDA);
        return !defensas.some(([df,dc]) => df===f && dc===c);
    });
    // Añade nuevas defensas
    for(const [f, c] of defensas) {
        paredes.push({
            tipo: 'ladrillo',
            x: c * TAM_CELDA + PARED_OFFSET/2,
            y: f * TAM_CELDA + PARED_OFFSET/2,
            w: TAM_CELDA - PARED_OFFSET,
            h: TAM_CELDA - PARED_OFFSET,
            vida: TIPOS_PARED['ladrillo'].vida
        });
    }

    jugador = new Tanque(TAM_CELDA*7, TAM_CELDA*(FILAS_MAPA-4), 'usuario', true);
    generarEnemigos();
}

// Clase Tanque con objetivo configurable
class Tanque {
    constructor(x, y, tipo, esUsuario, objetivo = 'jugador') {
        this.x = x;
        this.y = y;
        this.w = TAM_CELDA;
        this.h = TAM_CELDA;
        this.tipo = tipo;
        this.esUsuario = esUsuario;
        this.objetivo = objetivo; // 'jugador' o 'aguila'
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
            // SOLO bloquean movimiento ladrillo y metal
            if (
                colisionRectangulo({x:nx,y:ny,w:this.w,h:this.h}, pared) &&
                pared.tipo !== 'agua' && pared.tipo !== 'arbusto'
            ) {
                return false;
            }
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
        if (this.esUsuario) {
            // Seleccionar la imagen adecuada según la dirección para el jugador
            let imagen;
            switch(this.direccion) {
                case 'U': imagen = imagenTanqueUsuarioArriba; break;
                case 'D': imagen = imagenTanqueUsuarioAbajo; break;
                case 'L': imagen = imagenTanqueUsuarioIzquierda; break;
                case 'R': imagen = imagenTanqueUsuarioDerecha; break;
            }
            contexto.drawImage(imagen, this.x, this.y, this.w, this.h);
        } else {
            // Seleccionar la imagen adecuada según la dirección para los enemigos
            let imagen;
            switch(this.direccion) {
                case 'U': imagen = imagenTanqueEnemigoArriba; break;
                case 'D': imagen = imagenTanqueEnemigoAbajo; break;
                case 'L': imagen = imagenTanqueEnemigoIzquierda; break;
                case 'R': imagen = imagenTanqueEnemigoDerecha; break;
            }
            contexto.drawImage(imagen, this.x, this.y, this.w, this.h);
        }
    }
}

// Genera enemigos con objetivo dinámico según el nivel
function generarEnemigos() {
    tanquesEnemigos = [];
    enemigosNivel = nivel + 1;

    // A partir de nivel 3, 2 enemigos van al águila; antes, solo 1
    let objetivoAguila = nivel < 3 ? 1 : 2;
    for (let i = 0; i < enemigosNivel; i++) {
        let objetivo = (i < objetivoAguila) ? 'aguila' : 'jugador';
        let enemigo = new Tanque(TAM_CELDA + i*TAM_CELDA*2, TAM_CELDA, 'enemigo', false, objetivo);
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
                contexto.fillRect(c*TAM_CELDA + PARED_OFFSET/2, f*TAM_CELDA + PARED_OFFSET/2, TAM_CELDA - PARED_OFFSET, TAM_CELDA - PARED_OFFSET);
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

    // Movimiento de ENEMIGOS: SOLO horizontal o vertical por frame
    tanquesEnemigos.forEach(enemigo => {
        let objetivo = (enemigo.objetivo === 'aguila') ? aguila : jugador;
        if (enemigo.objetivo === 'aguila' && !aguila.viva) objetivo = jugador;

        // Diferencia en celdas
        const difX = objetivo.x - enemigo.x;
        const difY = objetivo.y - enemigo.y;
        let movido = false;

        // Primero intenta moverse horizontal, luego vertical
        if (Math.abs(difX) > 5) {
            if (difX > 0) {
                enemigo.direccion = 'R';
                if (enemigo.puedeMover(1,0)) {
                    enemigo.mover(1,0);
                    movido = true;
                }
            } else {
                enemigo.direccion = 'L';
                if (enemigo.puedeMover(-1,0)) {
                    enemigo.mover(-1,0);
                    movido = true;
                }
            }
        }
        if (!movido && Math.abs(difY) > 5) {
            if (difY > 0) {
                enemigo.direccion = 'D';
                if (enemigo.puedeMover(0,1)) {
                    enemigo.mover(0,1);
                    movido = true;
                }
            } else {
                enemigo.direccion = 'U';
                if (enemigo.puedeMover(0,-1)) {
                    enemigo.mover(0,-1);
                    movido = true;
                }
            }
        }

        // Si no pudo moverse, revisar si hay pared destructible y disparar
        if (!movido) {
            let dx = 0, dy = 0;
            switch (enemigo.direccion) {
                case 'R': dx = 1; break;
                case 'L': dx = -1; break;
                case 'D': dy = 1; break;
                case 'U': dy = -1; break;
            }
            let rect = enemigo.obtenerRectangulo(dx * enemigo.velocidad, dy * enemigo.velocidad);
            let obstaculo = paredes.find(
                pared =>
                    colisionRectangulo(rect, pared) &&
                    TIPOS_PARED[pared.tipo].destructible
            );
            if (obstaculo) {
                enemigo.disparar();
            }
        }

        // Si está alineado con su objetivo, también dispara
        if (Math.abs(enemigo.x - objetivo.x) < 10 || Math.abs(enemigo.y - objetivo.y) < 10) enemigo.disparar();

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