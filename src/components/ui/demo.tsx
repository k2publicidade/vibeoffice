import React from "react";
import AuthSwitch from "./auth-switch";

export default function Demo() {
    return (
        <div className="p-10 bg-muted/20 min-h-screen flex items-center justify-center">
            <div className="w-full max-w-6xl">
                <AuthSwitch />
            </div>
        </div>
    );
}
