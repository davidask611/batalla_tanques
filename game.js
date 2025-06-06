const lienzo = document.getElementById('lienzoJuego');
const contexto = lienzo.getContext('2d');

const TAM_CELDA = 40;
const COLUMNAS_MAPA = 16, FILAS_MAPA = 16;
let mapa = [];
let paredes = [];
let tanquesEnemigos = [];
let nivel = 1;

// Tipos de pared
const TIPOS_PARED = {
    ladrillo: { color: '#C1440E', vida: 2, destructible: true },
    metal: { color: '#888', vida: 6, destructible: true },
    agua: { color: '#2176AE', vida: 9999, destructible: false },
    arbusto: { color: '#3E8914', vida: 1, destructible: false }
};

// Cargar imágenes
const imagenTanqueUsuario = new Image();
imagenTanqueUsuario.src = 'img/t_usuario.png';
const imagenTanqueEnemigo = new Image();
imagenTanqueEnemigo.src = 'img/t_enemigo.png';
const imagenAguila = new Image();
imagenAguila.src = 'img/aguila.png';

// Ajustar el tamaño del lienzo al tamaño del mapa
function redimensionarLienzo() {
    lienzo.width = COLUMNAS_MAPA * TAM_CELDA;
    lienzo.height = FILAS_MAPA * TAM_CELDA;
}
redimensionarLienzo();
window.addEventListener('resize', redimensionarLienzo);

// Utilidad: Colisión de rectángulos
function colisionRectangulo(a, b) {
    return (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y);
}

// Generar el mapa inicial
function crearMapa() {
    mapa = [];
    paredes = [];
    for(let f=0; f<FILAS_MAPA; f++) {
        let fila = [];
        for(let c=0; c<COLUMNAS_MAPA; c++) {
            // Bordes de metal
            if(f === 0 || f === FILAS_MAPA-1 || c === 0 || c === COLUMNAS_MAPA-1) {
                fila.push('metal');
                paredes.push({ tipo: 'metal', x: c*TAM_CELDA, y: f*TAM_CELDA, w: TAM_CELDA, h: TAM_CELDA, vida: TIPOS_PARED['metal'].vida });
            }
            // Paredes alrededor del águila
            else if(f === FILAS_MAPA-3 && (c === Math.floor(COLUMNAS_MAPA/2)-1 || c === Math.floor(COLUMNAS_MAPA/2)+1)) {
                fila.push('ladrillo');
                paredes.push({ tipo: 'ladrillo', x: c*TAM_CELDA, y: f*TAM_CELDA, w: TAM_CELDA, h: TAM_CELDA, vida: TIPOS_PARED['ladrillo'].vida });
            }
            else if(f === FILAS_MAPA-2 && (c >= Math.floor(COLUMNAS_MAPA/2)-1 && c <= Math.floor(COLUMNAS_MAPA/2)+1)) {
                fila.push('ladrillo');
                paredes.push({ tipo: 'ladrillo', x: c*TAM_CELDA, y: f*TAM_CELDA, w: TAM_CELDA, h: TAM_CELDA, vida: TIPOS_PARED['ladrillo'].vida });
            }
            // Algunas paredes y agua aleatorias
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
                // El agua no se agrega a paredes porque no bloquea
            }
            else {
                fila.push(null);
            }
        }
        mapa.push(fila);
    }
}
crearMapa();

// Águila
const aguila = {
    x: Math.floor(COLUMNAS_MAPA/2)*TAM_CELDA,
    y: (FILAS_MAPA-1)*TAM_CELDA,
    w: TAM_CELDA, h: TAM_CELDA,
    viva: true
};

// Clase Tanque
class Tanque {
    constructor(x, y, tipo, esUsuario) {
        this.x = x;
        this.y = y;
        this.w = TAM_CELDA;
        this.h = TAM_CELDA;
        this.tipo = tipo; // 'usuario' o 'enemigo'
        this.esUsuario = esUsuario;
        this.direccion = 'U';
        this.velocidad = esUsuario ? 3 : 1.5 + (nivel-1)*0.4;
        this.vida = 3;
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
                x: px, y: py, direccion: this.direccion, velocidad: 8, w: 8, h: 8
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

// Crear tanque usuario
let jugador = new Tanque(TAM_CELDA*7, TAM_CELDA*(FILAS_MAPA-4), 'usuario', true);

// Generar enemigos
function generarEnemigos() {
    tanquesEnemigos = [];
    for (let i = 0; i < nivel + 1; i++) {
        let enemigo = new Tanque(TAM_CELDA + i*TAM_CELDA*2, TAM_CELDA, 'enemigo', false);
        enemigo.velocidad = 1 + nivel * 0.4;
        tanquesEnemigos.push(enemigo);
    }
}
generarEnemigos();

// Control de usuario
const teclas = {};
window.addEventListener('keydown', (evento) => { teclas[evento.key] = true; });
window.addEventListener('keyup', (evento) => { teclas[evento.key] = false; });

// Bucle principal del juego
function bucleJuego() {
    contexto.clearRect(0, 0, lienzo.width, lienzo.height);

    // Dibujar mapa (agua, arbustos)
    for (let f=0; f<mapa.length; f++)
        for (let c=0; c<mapa[f].length; c++) {
            if(mapa[f][c] && (mapa[f][c]==='agua' || mapa[f][c]==='arbusto')) {
                contexto.fillStyle = TIPOS_PARED[mapa[f][c]].color;
                contexto.fillRect(c*TAM_CELDA, f*TAM_CELDA, TAM_CELDA, TAM_CELDA);
            }
        }

    // Dibujar paredes sólidas
    for(const pared of paredes) {
        contexto.fillStyle = TIPOS_PARED[pared.tipo].color;
        contexto.fillRect(pared.x, pared.y, pared.w, pared.h);
    }

    // Dibujar águila
    if (aguila.viva) {
        contexto.drawImage(imagenAguila, aguila.x, aguila.y, aguila.w, aguila.h);
        contexto.strokeStyle = "#FFD700";
        contexto.strokeRect(aguila.x, aguila.y, aguila.w, aguila.h);
    }

    // Control del jugador
    if (teclas['ArrowUp'])    { jugador.direccion = 'U'; jugador.mover(0,-1);}
    if (teclas['ArrowDown'])  { jugador.direccion = 'D'; jugador.mover(0,1);}
    if (teclas['ArrowLeft'])  { jugador.direccion = 'L'; jugador.mover(-1,0);}
    if (teclas['ArrowRight']) { jugador.direccion = 'R'; jugador.mover(1,0);}
    if (teclas[' ']) jugador.disparar();

    // Dibujar y actualizar jugador
    jugador.dibujar();
    jugador.actualizarDisparos();

    // Enemigos: IA básica y actualización
    tanquesEnemigos.forEach(enemigo => {
        // IA: sigue al jugador en X/Y, evita paredes
        if (Math.abs(enemigo.x - jugador.x) > Math.abs(enemigo.y - jugador.y)) {
            enemigo.direccion = (enemigo.x < jugador.x) ? 'R' : 'L';
            enemigo.mover((enemigo.x < jugador.x)?1:-1,0);
        } else {
            enemigo.direccion = (enemigo.y < jugador.y) ? 'D' : 'U';
            enemigo.mover(0,(enemigo.y < jugador.y)?1:-1);
        }
        // Dispara si está alineado
        if (Math.abs(enemigo.x - jugador.x) < 10 || Math.abs(enemigo.y - jugador.y) < 10) enemigo.disparar();
        enemigo.dibujar();
        enemigo.actualizarDisparos();
    });

    // Dibujar disparos
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

    // Colisiones de disparos del jugador
    jugador.disparos = jugador.disparos.filter(d => {
        // Paredes
        for(const pared of paredes) {
            if(colisionRectangulo(d, pared)) {
                if(TIPOS_PARED[pared.tipo].destructible) {
                    pared.vida--;
                    if(pared.vida <= 0) paredes.splice(paredes.indexOf(pared), 1);
                }
                return false;
            }
        }
        // Enemigos
        for(const enemigo of tanquesEnemigos) {
            if(colisionRectangulo(d, enemigo)) {
                tanquesEnemigos.splice(tanquesEnemigos.indexOf(enemigo),1);
                return false;
            }
        }
        // Águila
        if(aguila.viva && colisionRectangulo(d, aguila)) {
            aguila.viva = false;
            return false;
        }
        return true;
    });

    // Colisiones de disparos enemigos
    tanquesEnemigos.forEach(enemigo => {
        enemigo.disparos = enemigo.disparos.filter(d => {
            // Paredes
            for(const pared of paredes) {
                if(colisionRectangulo(d, pared)) {
                    if(TIPOS_PARED[pared.tipo].destructible) {
                        pared.vida--;
                        if(pared.vida <= 0) paredes.splice(paredes.indexOf(pared), 1);
                    }
                    return false;
                }
            }
            // Jugador
            if(colisionRectangulo(d, jugador)) {
                // Aquí puedes implementar vidas
                jugador.x = TAM_CELDA*7; jugador.y = TAM_CELDA*(FILAS_MAPA-4);
                return false;
            }
            // Águila
            if(aguila.viva && colisionRectangulo(d, aguila)) {
                aguila.viva = false;
                return false;
            }
            return true;
        });
    });

    // Siguiente nivel si no quedan enemigos
    if(tanquesEnemigos.length === 0) {
        nivel++;
        crearMapa();
        jugador.x = TAM_CELDA*7; jugador.y = TAM_CELDA*(FILAS_MAPA-4);
        generarEnemigos();
        aguila.viva = true;
    }

    // Si el águila muere, reiniciar nivel
    if(!aguila.viva) {
        nivel = 1;
        crearMapa();
        jugador.x = TAM_CELDA*7; jugador.y = TAM_CELDA*(FILAS_MAPA-4);
        generarEnemigos();
        aguila.viva = true;
    }

    requestAnimationFrame(bucleJuego);
}

// Iniciar el bucle del juego
bucleJuego();