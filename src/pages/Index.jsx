import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Index() {
    const [phone, setPhone] = useState("");
    const navigate = useNavigate();

    function search() {
        const value = phone.trim();
        if (!value) {
            alert("Ingresa un número");
            return;
        }
        navigate(`/orders?phone=${encodeURIComponent(value)}`);
    }

    return (
        <div className="centered">
            <div className="card">
                <h1>Buscar entregables</h1>
                <input
                    className="text-input"
                    placeholder="Ej: 851"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                />
                <button className="btn" onClick={search}>
                    Buscar
                </button>
            </div>
        </div>
    );
}
