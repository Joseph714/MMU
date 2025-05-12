let secuenciaPage = [4, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2];
let numMarcos = 3;

function optimo(secuenciaPage, numMarcos) {
    let fallos = 0;
    let marcos = [];

    for (let i = 0; i < secuenciaPage.length; i++) {
        let paginaActual = secuenciaPage[i];

        if (marcos.includes(paginaActual)) {
            continue; // No hay fallo
        }

        if (marcos.length < numMarcos) {
            marcos.push(paginaActual);
            fallos++;
        } else {
            let reemplazoIndex = encontrarReemplazo(marcos, secuenciaPage, i + 1);
            marcos[reemplazoIndex] = paginaActual;
            fallos++;
        }
    }

    console.log("Marcos finales:", marcos);
    console.log("Total de fallos:", fallos);
}

function encontrarReemplazo(marcos, secuenciaPage, posicionActual) {
    let mayorDistancia = -1;
    let indiceReemplazo = -1;

    for (let i = 0; i < marcos.length; i++) {
        let pagina = marcos[i];
        let encontrada = false;
        for (let j = posicionActual; j < secuenciaPage.length; j++) {
            if (secuenciaPage[j] === pagina) {
                encontrada = true;
                if (j - posicionActual > mayorDistancia) {
                    mayorDistancia = j - posicionActual;
                    indiceReemplazo = i;
                }
                break;
            }
        }

        if (!encontrada) {
            // No se vuelve a usar, reemplazarla directamente
            return i;
        }
    }

    return indiceReemplazo;
}

optimo(secuenciaPage, numMarcos);
