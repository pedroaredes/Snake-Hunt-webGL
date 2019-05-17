/* Variávei globais */

let {mat4, vec4, vec3, vec2} = glMatrix;

let SPEED = 0.1;

const COS_45 = Math.cos(Math.PI * 0.25);

let ku = false, 
    kd = false, 
    kl = false, 
    kr = false,
    pos = [0,1,0];
    pos2 = [20,0.5,15];
    pos3 = [5,1,5];
    snake = [];
    parede1v = [20,2,9];
    parede1vp = [20,2,15];
    parede2v = [];
    parede3v = [];
    parede4v = [];
    trail = 1;

var sombra = new Array(200).fill({x:0,y:0,z:0});



let frame = 0,
    canvas,
    gl,
    vertexShaderSource,
    fragmentShaderSource,
    vertexShader,
    fragmentShader,
    shaderProgram,
    data,
    positionAttr,
    positionBuffer,
    normalAttr,
    normalBuffer,
    width,
    height,
    projectionUniform,
    projection,
    loc = [0, 0, 0],
    modelUniform,
    model,
    model2,
    model3,
    viewUniform,
    view,
    eye = [0, 0, 0],
    colorUniform,
    color1 = [1, 0, 0],
    color2 = [.79,.47,.79],
    color3 = [.92,.51,.23],
    color4 = [1, 0, 0],
    colorGold = [2.55, 2.55, 0],
    color5 = [.5,.5,.5],
    color6 = [0, 1, 1],
    colorTeste = [0,1,0],
    gameLoop = true,
    score = 0,
    lucky;

    

function resize() {
    if (!gl) return;
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.setAttribute("width", width);
    canvas.setAttribute("height", height);
    gl.viewport(0, 0, width, height);
    let aspect = width / height;
    let near = 0.001;
    let far = 1000;
    let fovy = 1.3;
    projectionUniform = gl.getUniformLocation(shaderProgram, "projection");
    projection = mat4.perspective([], fovy, aspect, near, far);
    gl.uniformMatrix4fv(projectionUniform, false, projection);
}


function getCanvas() {
    return document.querySelector("canvas");
}

function getGLContext(canvas) {
    let gl = canvas.getContext("webgl");
    gl.enable(gl.DEPTH_TEST);
    return gl;
}

function compileShader(source, type, gl) {
    let shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        console.error("ERRO NA COMPILAÇÃO", gl.getShaderInfoLog(shader));
    return shader;
}

function linkProgram(vertexShader, fragmentShader, gl) {
    let program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        console.error("ERRO NA LINKAGEM");
    return program;
}

function getData() {
    let p = {
        a: [-0.5, 0.5, -0.5],
        b: [-0.5, -0.5, -0.5],
        c: [0.5, 0.5, -0.5],
        d: [0.5, -0.5, -0.5],
        e: [-0.5, 0.5, 0.5],
        f: [0.5, 0.5, 0.5],
        g: [-0.5, -0.5, 0.5],
        h: [0.5, -0.5, 0.5]
    };

    let faces = [
        // FRENTE
        ...p.a, ...p.b, ...p.c,
        ...p.d, ...p.c, ...p.b,

        // TOPO
        ...p.e, ...p.a, ...p.f,
        ...p.c, ...p.f, ...p.a,

        // BAIXO
        ...p.b, ...p.g, ...p.d,
        ...p.h, ...p.d, ...p.g,

        // ESQUERDA
        ...p.e, ...p.g, ...p.a,
        ...p.b, ...p.a, ...p.g,

        // DIREITA
        ...p.c, ...p.d, ...p.f,
        ...p.h, ...p.f, ...p.d,

        //FUNDO
        ...p.f, ...p.h, ...p.e,
        ...p.g, ...p.e, ...p.h
    ];

    let n = {
        frente: [0,0,-1],
        topo: [0,1,0],
        baixo: [0,-1,0],
        esquerda: [-1,0,0],
        direita: [1,0,0],
        fundo: [0,0,1],
      };
    
      let faceNormals = {
        frente: [...n.frente, ...n.frente, ...n.frente, ...n.frente, ...n.frente, ...n.frente],
        topo: [...n.topo, ...n.topo, ...n.topo, ...n.topo, ...n.topo, ...n.topo],
        baixo: [...n.baixo, ...n.baixo, ...n.baixo, ...n.baixo, ...n.baixo, ...n.baixo],
        esquerda: [...n.esquerda, ...n.esquerda, ...n.esquerda, ...n.esquerda, ...n.esquerda, ...n.esquerda],
        direita: [...n.direita, ...n.direita, ...n.direita, ...n.direita, ...n.direita, ...n.direita],
        fundo: [...n.fundo, ...n.fundo, ...n.fundo, ...n.fundo, ...n.fundo, ...n.fundo],
      };
    
      let normals = [
        ...faceNormals.frente,
        ...faceNormals.topo,
        ...faceNormals.baixo,
        ...faceNormals.esquerda,
        ...faceNormals.direita,
        ...faceNormals.fundo
      ];

    return { "points": new Float32Array(faces), "normals": new Float32Array(normals)};
}

async function main() {
    // 1 - Carregar tela de desenho
    canvas = getCanvas();

    // 2 - Carregar o contexto (API) WebGL
    gl = getGLContext(canvas);

    // 3 - Ler os arquivos de shader
    vertexShaderSource = await fetch("vertex.glsl").then(r => r.text());
    console.log("VERTEX", vertexShaderSource);

    fragmentShaderSource = await fetch("fragment.glsl").then(r => r.text());
    console.log("FRAGMENT", fragmentShaderSource);

    // 4 - Compilar arquivos de shader
    vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER, gl);
    fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER, gl);

    // 5 - Linkar o programa de shader
    shaderProgram = linkProgram(vertexShader, fragmentShader, gl);
    gl.useProgram(shaderProgram);

    // 6 - Criar dados de parâmetro
    data = getData();

    // 7 - Transferir os dados para GPU
    positionAttr = gl.getAttribLocation(shaderProgram, "position");
    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data.points, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionAttr);
    gl.vertexAttribPointer(positionAttr, 3, gl.FLOAT, false, 0, 0);

    normalAttr = gl.getAttribLocation(shaderProgram, "normal");
    normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data.normals, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(normalAttr);
    gl.vertexAttribPointer(normalAttr, 3, gl.FLOAT, false, 0, 0);

    // 7.1 - PROJECTION MATRIX UNIFORM
    resize();
    window.addEventListener("resize", resize);

    // 7.2 - VIEW MATRIX UNIFORM
    eye  = [0, 10, 10];
    let up = [0, 1, 0];
    let center = [0, 0, 0];
    view = mat4.lookAt([], eye, center, up);
    viewUniform = gl.getUniformLocation(shaderProgram, "view");
    gl.uniformMatrix4fv(viewUniform, false, view);

    // 7.3 - MODEL MATRIX UNIFORM
    model = mat4.create();
    modelUniform = gl.getUniformLocation(shaderProgram, "model");
    
    snake[0] = mat4.fromTranslation([], pos);

    model3 = mat4.fromScaling([],pos2);

    apple = mat4.fromTranslation([],pos3);

    parede1 = mat4.fromValues(16/*aqui mexe a E em x*/ ,0,0,0,0,1/*aqui mexe a E em Y*/,0,0,0,0,0.5/*aqui mexe a E em z*/,0,0/*aqui mexe a P em X*/,0.5/*aqui mexe a P em Y*/,7/*aqui mexe a E em Z*/,1);
    parede2 = mat4.fromValues(16/*aqui mexe a E em x*/ ,0,0,0,0,1/*aqui mexe a E em Y*/,0,0,0,0,0.5/*aqui mexe a E em z*/,0,0/*aqui mexe a P em X*/,0.5/*aqui mexe a P em Y*/,-7/*aqui mexe a E em Z*/,1);
    parede3 = mat4.fromValues(0.5/*aqui mexe a E em x*/ ,0,0,0,0,1/*aqui mexe a E em Y*/,0,0,0,0,14.5/*aqui mexe a E em z*/,0,-8/*aqui mexe a P em X*/,0.5/*aqui mexe a P em Y*/,0/*aqui mexe a E em Z*/,1);
    parede4 = mat4.fromValues(0.5/*aqui mexe a E em x*/ ,0,0,0,0,1/*aqui mexe a E em Y*/,0,0,0,0,14.5/*aqui mexe a E em z*/,0,8/*aqui mexe a P em X*/,0.5/*aqui mexe a P em Y*/,0/*aqui mexe a E em Z*/,1);
    
    console.log(model3);
    


    // 7.4 - COLOR UNIFORM
    colorUniform = gl.getUniformLocation(shaderProgram, "color");
    //gl.uniform2f(locationUniform, loc[0], loc[1]);

    // 8 - Chamar o loop de redesenho
    init();
    loop();

}
function init(){
    gl.uniformMatrix4fv(modelUniform, false, parede1);
    gl.uniform3f(colorUniform, color5[0], color5[1], color5[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 36);

    gl.uniformMatrix4fv(modelUniform, false, parede2);
    gl.uniform3f(colorUniform, color5[0], color5[1], color5[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 36);

    gl.uniformMatrix4fv(modelUniform, false, parede3);
    gl.uniform3f(colorUniform, color5[0], color5[1], color5[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 36);

    gl.uniformMatrix4fv(modelUniform, false, parede4);
    gl.uniform3f(colorUniform, color5[0], color5[1], color5[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 36);
}
function snakeCollision(){
    for(let j = 2; j<snake.length;j++){
        var testando = [sombra[j*10].x,sombra[j*10].z]; 
        if(collide(pos[0],pos[2]/*primeira parte*/,testando[0], testando[1])){
            gameLoop = false;       
        }
}
}

function loop() {
        frame ++;
        move();

        let time = frame / 100;  

        snake[0] = mat4.fromTranslation([],pos);
        apple = mat4.fromTranslation([], pos3); 

        sombra = [{x: pos[0], y: pos[1], z: pos[2]}, ...sombra];
        if(sombra.length > 200000){
            sombra = sombra.slice(0,200000);
        }  
        for(var i = 0; i<trail;i++){
            var posSnake= [sombra[i*10].x,sombra[i*10].y,sombra[i*10].z];
            snake[i] = mat4.fromTranslation([],posSnake); 
            snakeCollision();      
        }   
        eye  = [Math.sin(time) * 5, 3, Math.cos(time) * 5];
        gl.uniformMatrix4fv(viewUniform, false, view);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        //redesenhar
        redraw();
        //Saber se jogo continua, ou acabou, e caso acabou se ele deseja jogar dnv
        if(gameLoop==true){
        window.requestAnimationFrame(loop);
        }
        else if (confirm("You lose! Press OK to play again or CANCEL to quit.")){
            location.reload();
            
        }
        else{
            document.getElementById("Canvas").style.display = "none";
            //document.getElementById("name").style.display = "none";
            document.getElementById("score").style.display = "none";
            document.getElementById("inst1").style.display = "none";
            document.getElementById("inst2").style.display = "none";
            document.getElementById("listra1").style.display = "none";
            document.getElementById("listra2").style.display = "none";
            document.getElementById("listra3").style.display = "none";
            document.getElementById("inst3").style.display = "none";
            document.getElementById("name").innerHTML = "Game Over!";  
            
        }
    }

function follow(evt) {
    let locX = evt.x / window.innerWidth * 2 - 1;
    let locY = evt.y / window.innerHeight * -2 + 1;
    loc = [locX, locY];
}
function keyDown(evt){
    if(evt.key === "ArrowDown" && ku!= -1) {
        kd = 1;
        ku = 0;
        kl = 0;
        kr = 0;
    }

    if(evt.key === "ArrowUp" && kd !=1){
        kd = 0;
        ku = -1;
        kl = 0;
        kr = 0;
    }

    if(evt.key === "ArrowLeft" && kr !=1){
        kd = 0;
        ku = 0;
        kl = -1;
        kr = 0;
    } 
    if(evt.key === "ArrowRight" && kl!=-1){
        kd = 0;
        ku = 0;
        kl = 0;
        kr = 1;
    }  
}

function move(){
    
    let hor = (kl + kr) * SPEED;
    let ver = (ku + kd) * SPEED;

    if(hor !== 0 && ver !== 0){
        hor *= COS_45;
        ver *= COS_45;
    }

    if(pos[0]>7.3){
        pos[0] = -7.3;
    }

    if(pos[0]<-7.3){
        pos[0] = 7.3;
    }

    if(pos[2]>6.3){
        pos[2] = -6.3;
    }

    if(pos[2]<-6.3){
        pos[2] = 6.3;
    }

    pos[0] += hor;
    pos[2] += ver;
   

    if(collide(pos[0],pos[2],pos3[0],pos3[2])){
        if(lucky <=1){
            trail +=2;
            score += 15;
        }
        else{
            trail++;
            score += 5;
        }
        pos3 = randomApple();
        lucky = Math.floor(Math.random()* 10);
        console.log(lucky)
        document.getElementById("score").innerHTML = "Score: " + score + "";        
    }
    
}

function collide(x,z,x2,z2){
    return vec2.dist([x,z],[x2,z2]) < 1;
    
}

function redraw(){

    // snake
    for(let i=0;i<trail;i++){
        const atual = snake[i];
        if(i%2==0){
        gl.uniformMatrix4fv(modelUniform, false, atual);
        gl.uniform3f(colorUniform, color2[0], color2[1], color2[2]);
        gl.drawArrays(gl.TRIANGLES, 0, 36);
        } 
        else{
            gl.uniformMatrix4fv(modelUniform, false, atual);
            gl.uniform3f(colorUniform, colorTeste[0], colorTeste[1], colorTeste[2]);
            gl.drawArrays(gl.TRIANGLES, 0, 36); 
        }
    }
    //apple
    if(lucky <= 1){
        gl.uniformMatrix4fv(modelUniform, false, apple);
        gl.uniform3f(colorUniform, colorGold[0], colorGold[1], colorGold[2]);
        gl.drawArrays(gl.TRIANGLES, 0, 36);
        
    }
    else{
        gl.uniformMatrix4fv(modelUniform, false, apple);
        gl.uniform3f(colorUniform, color4[0], color4[1], color4[2]);
        gl.drawArrays(gl.TRIANGLES, 0, 36);
    }
    //field
    gl.uniformMatrix4fv(modelUniform, false, model3);
    gl.uniform3f(colorUniform, color3[0], color3[1], color3[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 36);

    gl.uniformMatrix4fv(modelUniform, false, parede1);
    gl.uniform3f(colorUniform, color5[0], color5[1], color5[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 36);

    gl.uniformMatrix4fv(modelUniform, false, parede2);
    gl.uniform3f(colorUniform, color5[0], color5[1], color5[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 36);

    gl.uniformMatrix4fv(modelUniform, false, parede3);
    gl.uniform3f(colorUniform, color5[0], color5[1], color5[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 36);

    gl.uniformMatrix4fv(modelUniform, false, parede4);
    gl.uniform3f(colorUniform, color5[0], color5[1], color5[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 36);
    
}
function randomApple(){
    let X = 1, Z = 1;
    X = Math.floor(Math.random()* 10)-5;
    Z = Math.floor(Math.random()* 12)-6;
    return [X,1,Z]
}
// keypress, keydown, keyup
window.addEventListener("load", main);

window.addEventListener("mousemove", follow);

//window.addEventListener("keyup", keyUp);
window.addEventListener("keydown", keyDown);