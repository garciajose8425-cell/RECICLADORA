let materiales = [];
let compraActual = [];
let ventaActual = [];
const materialVenta =
    document.getElementById("materialVenta");

const material = document.getElementById("material");
const precio = document.getElementById("precio");
const libras = document.getElementById("libras");

async function cargarMateriales() {

    const { data, error } = await supabaseClient
        .from("materiales")
        .select("*")
        .order("nombre");

    if (error) {
        alert("Error cargando materiales: " + error.message);
        return;
    }

    materiales = data;

    material.innerHTML = "";
materialVenta.innerHTML = "";

   materiales.forEach(m => {

    let op1 = document.createElement("option");

    op1.value = m.nombre;
    op1.textContent = m.nombre;

    material.appendChild(op1);

    let op2 = document.createElement("option");

    op2.value = m.nombre;
    op2.textContent = m.nombre;

    materialVenta.appendChild(op2);

});

    actualizarPrecio();
actualizarVenta();
}

function actualizarPrecio() {

    let seleccionado =
        materiales.find(
            x => x.nombre === material.value
        );

    if (!seleccionado) return;

    precio.value = seleccionado.precio_compra;

    calcularSubtotal();

}

material.addEventListener("change", actualizarPrecio);

libras.addEventListener("input", calcularSubtotal);

precio.addEventListener("input", calcularSubtotal);

function calcularSubtotal() {

    let total =
        (Number(libras.value) || 0) *
        (Number(precio.value) || 0);

    document.getElementById("subtotal").innerHTML =
        "Subtotal: C$" + total.toFixed(2);

}

function agregarItem() {

    if (!libras.value) return;

    let seleccionado =
        materiales.find(
            x => x.nombre === material.value
        );

    let subtotal =
        Number(libras.value) *
        Number(precio.value);

    compraActual.push({

        material_id: seleccionado.id,
        material: seleccionado.nombre,
        libras: Number(libras.value),
        precio: Number(precio.value),
        subtotal

    });

    render();

    libras.value = "";

    calcularSubtotal();

}

function render() {

    let html = "";

    let total = 0;

    compraActual.forEach(x => {

        total += x.subtotal;

        html += `
        <div class="item">
            <b>${x.material}</b>
            |
            ${x.libras} lb
            |
            C$${x.subtotal.toFixed(2)}
        </div>
        `;

    });

    document.getElementById("detalleCompra").innerHTML = html;

    document.getElementById("totalGeneral").innerHTML =
        "C$" + total.toFixed(2);

}

async function guardarCompra() {

    if (compraActual.length === 0) {

        alert("No hay materiales agregados.");
        return;

    }

    try {

        let total = compraActual.reduce(
            (sum, item) => sum + item.subtotal,
            0
        );

        const { data: compraData, error: compraError } =
            await supabaseClient
                .from("compras")
                .insert([
                    {
                        total: total
                    }
                ])
                .select()
                .single();

        if (compraError) throw compraError;

        const compraId = compraData.id;

        const detalles = compraActual.map(item => ({

            compra_id: compraId,
            material_id: item.material_id,
            libras: item.libras,
            precio_lb: item.precio,
            subtotal: item.subtotal

        }));

        const { error: detalleError } =
            await supabaseClient
                .from("detalle_compra")
                .insert(detalles);

        if (detalleError) throw detalleError;

        for (const item of compraActual) {

            const { data: invData, error: invError } =
                await supabaseClient
                    .from("inventario")
                    .select("libras")
                    .eq("material_id", item.material_id)
                    .single();

            if (invError) throw invError;

            const nuevasLibras =
                Number(invData.libras) +
                Number(item.libras);

            const { error: updateError } =
                await supabaseClient
                    .from("inventario")
                    .update({
                        libras: nuevasLibras
                    })
                    .eq("material_id", item.material_id);

            if (updateError) throw updateError;

        }

        alert("Compra guardada correctamente.");

        compraActual = [];

        render();

        document.getElementById("detalleCompra").innerHTML = "";

        document.getElementById("totalGeneral").innerHTML =
            "C$0.00";

        libras.value = "";

        calcularSubtotal();

    }
    catch (error) {

        console.error(error);

        alert(
            "Error al guardar: " +
            error.message
        );

    }

}

async function verInventario() {

    const { data, error } = await supabaseClient
        .from("inventario")
        .select(`
            libras,
            materiales (
                nombre
            )
        `);

    if (error) {

        alert(error.message);
        return;

    }

    let html = "<h2>Inventario</h2>";

    data.forEach(item => {

        html += `
        <div class="item">
            <b>${item.materiales.nombre}</b>
            :
            ${Number(item.libras).toFixed(2)} lb
        </div>
        `;

    });

    document.getElementById(
        "inventarioLista"
    ).innerHTML = html;

}

cargarMateriales();
function mostrarSeccion(id){

    document
        .querySelectorAll(".seccion")
        .forEach(x => x.classList.add("oculto"));

    document
        .getElementById(id)
        .classList.remove("oculto");

}
async function verCompras() {

    const { data, error } =
        await supabaseClient
            .from("compras")
            .select("*")
            .order("fecha", {
                ascending: false
            });

    if (error) {

        alert(error.message);
        return;

    }

    let html = "";

    data.forEach(c => {

        const fecha = new Date(c.fecha + "Z");

        const fechaLocal =
            fecha.toLocaleDateString(
                "es-NI",
                {
                    timeZone: "America/Managua"
                }
            );

        const horaLocal =
            fecha.toLocaleTimeString(
                "es-NI",
                {
                    timeZone: "America/Managua"
                }
            );

        html += `
            <div class="item">

                <b>Compra #${c.id}</b><br>

                📅 ${fechaLocal}<br>

                🕒 ${horaLocal}<br>

                💰 Total: C$${Number(c.total).toFixed(2)}

            </div>
        `;

    });

    document.getElementById(
        "historialCompras"
    ).innerHTML = html;

}
const precioVenta =
    document.getElementById("precioVenta");

const librasVenta =
    document.getElementById("librasVenta");

const inventarioDisponible =
    document.getElementById("inventarioDisponible");

materialVenta.addEventListener(
    "change",
    actualizarVenta
);

librasVenta.addEventListener(
    "input",
    calcularSubtotalVenta
);

async function actualizarVenta(){

    let seleccionado =
        materiales.find(
            x => x.nombre === materialVenta.value
        );

    if(!seleccionado) return;

    precioVenta.value =
        seleccionado.precio_venta;

    const { data, error } =
        await supabaseClient
            .from("inventario")
            .select("libras")
            .eq(
                "material_id",
                seleccionado.id
            )
            .single();

    if(error){

        alert(error.message);
        return;

    }

    inventarioDisponible.value =
        Number(data.libras).toFixed(2);

    calcularSubtotalVenta();

}

function calcularSubtotalVenta(){

    let subtotal =
        (Number(librasVenta.value) || 0)
        *
        (Number(precioVenta.value) || 0);

    document.getElementById(
        "subtotalVenta"
    ).innerHTML =
        "Subtotal: C$" +
        subtotal.toFixed(2);

}
function agregarVenta(){

    let libras =
        Number(librasVenta.value);

    let inventario =
        Number(inventarioDisponible.value);

    if(libras <= 0){

        alert("Ingrese libras.");
        return;

    }

    if(libras > inventario){

        alert(
            "Inventario insuficiente."
        );

        return;

    }

    let seleccionado =
        materiales.find(
            x => x.nombre === materialVenta.value
        );

    let subtotal =
        libras *
        Number(precioVenta.value);

    ventaActual.push({

        material_id: seleccionado.id,
        material: seleccionado.nombre,
        libras: libras,
        precio: Number(precioVenta.value),
        subtotal

    });

    renderVenta();

    librasVenta.value = "";

    calcularSubtotalVenta();

}
function renderVenta(){

    let html = "";

    let total = 0;

    ventaActual.forEach(x=>{

        total += x.subtotal;

        html += `
            <div class="item">
                <b>${x.material}</b>
                |
                ${x.libras} lb
                |
                C$${x.subtotal.toFixed(2)}
            </div>
        `;

    });

    document.getElementById(
        "detalleVenta"
    ).innerHTML = html;

    document.getElementById(
        "totalVenta"
    ).innerHTML =
        "C$" + total.toFixed(2);

}
async function guardarVenta(){

    if(ventaActual.length === 0){

        alert(
            "No hay materiales agregados."
        );

        return;

    }

    try{

        let total =
            ventaActual.reduce(
                (s,x)=>s+x.subtotal,
                0
            );

        const {
            data: ventaData,
            error: ventaError
        } =
        await supabaseClient
            .from("ventas")
            .insert([
                {
                    total
                }
            ])
            .select()
            .single();

        if(ventaError)
            throw ventaError;

        const ventaId =
            ventaData.id;

        const detalles =
            ventaActual.map(x => ({

                venta_id: ventaId,
                material_id: x.material_id,
                libras: x.libras,
                precio_lb: x.precio,
                subtotal: x.subtotal

            }));

        const {
            error: detalleError
        } =
        await supabaseClient
            .from("detalle_venta")
            .insert(detalles);

        if(detalleError)
            throw detalleError;

        for(const item of ventaActual){

            const {
                data: invData
            } =
            await supabaseClient
                .from("inventario")
                .select("libras")
                .eq(
                    "material_id",
                    item.material_id
                )
                .single();

            const nuevasLibras =
                Number(invData.libras)
                -
                Number(item.libras);

            await supabaseClient
                .from("inventario")
                .update({
                    libras:
                        nuevasLibras
                })
                .eq(
                    "material_id",
                    item.material_id
                );

        }

        alert(
            "Venta guardada correctamente."
        );

        ventaActual = [];

        document.getElementById(
            "detalleVenta"
        ).innerHTML = "";

        document.getElementById(
            "totalVenta"
        ).innerHTML =
            "C$0.00";

        actualizarVenta();

    }
    catch(error){

        console.error(error);

        alert(
            "Error: " +
            error.message
        );

    }

}
async function cargarDashboard(){

    try{

        const { data: compras } =
            await supabaseClient
                .from("compras")
                .select("total");

        const { data: ventas } =
            await supabaseClient
                .from("ventas")
                .select("total");

        const { data: inventario } =
            await supabaseClient
                .from("inventario")
                .select(`
                    libras,
                    materiales (
                        nombre
                    )
                `);

        let totalCompras = compras.reduce(
            (s,x)=>s+Number(x.total),
            0
        );

        let totalVentas = ventas.reduce(
            (s,x)=>s+Number(x.total),
            0
        );

        let ganancia =
            totalVentas - totalCompras;

        let mayorInventario =
            inventario.sort(
                (a,b)=>
                Number(b.libras) -
                Number(a.libras)
            )[0];

        document.getElementById(
            "dashboardInfo"
        ).innerHTML = `

            <div class="item">
                <b>Compras Totales</b><br>
                C$${totalCompras.toFixed(2)}
            </div>

            <div class="item">
                <b>Ventas Totales</b><br>
                C$${totalVentas.toFixed(2)}
            </div>

            <div class="item">
                <b>Ganancia Bruta</b><br>
                C$${ganancia.toFixed(2)}
            </div>

            <div class="item">
                <b>Mayor Inventario</b><br>
                ${mayorInventario.materiales.nombre}
                <br>
                ${Number(
                    mayorInventario.libras
                ).toFixed(2)} lb
            </div>

        `;

    }
    catch(error){

        console.error(error);

        alert(error.message);

    }

}