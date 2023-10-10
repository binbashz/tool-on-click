const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); 
const multer = require('multer');
var fs = require('fs');

// Configura el almacenamiento y las opciones de 'multer'
const storage = multer.diskStorage({
    destination: './public/uploads', // Directorio donde se guardarán los archivos
    filename: (req, file, callback) => {
        const uniqueFileName = `${uuidv4()}-${file.originalname}`;
        callback(null, uniqueFileName); // Utiliza UUID para generar un nombre único para el archivo
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, callback) => {
        if (file.fieldname === "foto") {
            callback(null, true);
        } else {
            callback(new Error("Unexpected field")); // Campo inesperado
        }
    }
});


// Configurar CORS para permitir solicitudes desde cualquier origen local
app.use(cors({
    origin: 'http://localhost:4000', // Puedes cambiar el puerto si es diferente
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // Si necesitas admitir cookies en las solicitudes
  }));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
// Establece la carpeta 'public' para servir archivos estáticos (como imágenes)
app.use('/public', express.static(path.join(__dirname, 'public')));

// 3 invocamos a dotenv
const dotenv = require('dotenv');
dotenv.config({ path: './env/.env' });

// 4 seteamos el directorio public
app.use('/resources', express.static('public'));
app.use('/resources', express.static(__dirname + '/public'));

// 5 estbalecemos el motor de plantillas ejs
app.set('view engine', 'ejs');

// 6 invocamos a bcryptjs
const bcryptjs = require('bcryptjs');

// 7 var de session
const session = require('express-session');
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));

// 8 invocamos al modulo de conexion db
const connection = require('./database/db');

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/registro', (req, res) => {
    res.render('registro');
});

app.get('/about', (req, res) => {
    res.render('about');
});

//Ruta para el registro ****************

app.post('/registro', async (req, res) => {
    // Obtener los datos del formulario enviado al servidor
    const documento = req.body.documento;
    const name = req.body.name;
    const email = req.body.email;
    const password = req.body.password;
    const confirm_password = req.body.confirm_password;
    const birthdate = req.body.birthdate;
    const department = req.body.department;

    const currentDate = new Date();
    const userBirthdate = new Date(birthdate);
    const age = currentDate.getFullYear() - userBirthdate.getFullYear();

    if (password !== confirm_password) {
        res.render('registro', {
            alert: true,
            alertTitle: "Registro",
            alertMessage: "Las contraseñas no coinciden",
            alertIcon: 'error',
            showConfirmButton: true,
            timer: false,
            ruta: ''
        });
        return;
    }
    if (age < 18) {
        res.render('registro', {
            alert: true,
            alertTitle: "Registro",
            alertMessage: "Debes ser mayor de 18 años para registrarte.",
            alertIcon: 'error',
            showConfirmButton: true,
            timer: false,
            ruta: ''
        });
        return;
    }

    if (!department) {
        res.render('registro', {
            alert: true,
            alertTitle: "Registro",
            alertMessage: "Debes seleccionar un departamento.",
            alertIcon: 'error',
            showConfirmButton: true,
            timer: false,
            ruta: ''
        });
        return;
    }

    let passwordHash = await bcryptjs.hash(password, 8);
    connection.query('INSERT INTO users SET ?', {  // Insertamos los datos 
         documento: documento, 
         name: name, 
         email: email,
          password: passwordHash, 
          birthdate: birthdate, 
          department: department 
        }, async (error, results) => {
        if (error) {
            console.log(error);
            // Manejo de errores, puedes renderizar la vista de registro con un mensaje de error si es necesario
            res.render('registro', {
                alert: true,
                alertTitle: "Error en el Registro",
                alertMessage: "Ha ocurrido un error al registrar el usuario. Por favor, inténtalo de nuevo más tarde.",
                alertIcon: 'error',
                showConfirmButton: true,
                timer: false,
                ruta: ''
            });
        } else {
            // Almacenar valores en la sesión
            const usuario_id = results.insertId; // Obtiene el ID del usuario registrado
            req.session.loggedin = true;
            req.session.usuario_id = usuario_id;
            req.session.documento= documento; // Nombre numero del  usuario
            req.session.name = name; // Nombre completo
            req.session.email = email; // Correo electrónico
            
            res.redirect('/perfil');

            // Redirigir al usuario a la vista de registro exitoso
            res.render('perfil', {
                alert: true,
                alertTitle: "Registro Exitoso",
                alertMessage: "Registro con éxito",
                alertIcon: 'success',
                showConfirmButton: false,
                timer: 1500,
                ruta: ''
            });
        }
    });
});


// auth - maneja la autenticación de los usuarios y crea una sesión cuando un usuario inicia sesión con éxito

app.post('/auth', async (req, res) => {
    const documento = req.body.documento;
    const password = req.body.password;

    if (!documento || !password) {
        res.render('login', {
            alert: true,
            alertTitle: "Advertencia",
            alertMessage: "Ingrese un usuario y/o contraseña",
            alertIcon: "warning",
            showConfirmButton: false,
            showLoginButton: true,
            showRegisterButton: true,
            timer: false,
            ruta: 'login'
        });
        return;
    }

    let passwordHash = await bcryptjs.hash(password, 8);

    connection.query('SELECT * FROM users WHERE documento = ?', [documento], async (error, results) => {
        if (error) {
            console.log(error);
        } else {
            if (results.length === 0 || !(await bcryptjs.compare(password, results[0].password))) {
                res.render('login', {
                    alert: true,
                    alertTitle: "Error",
                    alertMessage: "El nombre de usuario o contraseña son incorrectos",
                    alertIcon: 'error',
                    showConfirmButton: false,
                    showLoginButton: true,
                    showRegisterButton: true,
                    timer: false,
                    ruta: 'login'
                });
            } else {
                req.session.loggedin = true;
                req.session.documento = results[0].documento; // nombre de registro
                req.session.userId = results[0].id;  // asigna ID del usuario a la variable de sesión userId
                req.session.name = results[0].name; // Nombre de usuario
                req.session.email = results[0].email; // Correo

                // Verificar si hay datos del formulario guardados en la sesión
                if (req.session.formData) {
                    // Si hay datos del formulario en la sesión, redirige de vuelta al formulario
                    res.render('publicar-auto', {
                        formData: req.session.formData, // Pasa los datos del formulario para prellenarlos
                        alert: true,
                        alertTitle: "Conexion exitosa",
                        alertMessage: "Inicio de sesión correcto",
                        alertIcon: "success",
                        showConfirmButton: false,
                        showLoginButton: false,
                        showRegisterButton: false,
                        timer: 1500,
                        ruta: '/'
                    });

                    // Luego, elimina los datos del formulario de la sesión
                    delete req.session.formData;
                } else {
                    // Si no hay datos del formulario en la sesión, simplemente redirige a la página principal u otra página según tu lógica
                    res.redirect('/');
                }
            }
        }
    });
});

// Ruta para el perfil del usuario
app.get('/perfil', (req, res) => {
    if (req.session.loggedin) {
        res.render('perfil', {
            documento: req.session.documento, // muestra el numero de usuario en el perfil
            name: req.session.name, // muestra nombre de pila en su perfil
            email: req.session.email 
        });
    } else {
        res.redirect('/login');
    }
});








































app.get('/', (req, res) => {
    if (req.session.loggedin) {
        res.render('index', {
            login: true,
            name: req.session.name
        });
    } else {
        res.render('index', {
            login: false,
            name: 'Debe iniciar sesión'
        });
    }
});


// ruta  cerrar sesion
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/')
    })
})

// Ruta para mostrar la página de error personalizada
app.get('/error.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'error.html'));
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);

    res.status(500).sendFile(path.join(__dirname, 'public', 'error.html'));
});


app.listen(4000, (req, res) => {
    console.log('server running in http://localhost:4000/');
});
