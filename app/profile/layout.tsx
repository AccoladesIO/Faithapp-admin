import React from "react";
import Shell from "../Shell";

const layout = ({ children }: { children: React.ReactNode }) => {
    return <Shell>{children}</Shell>;
};

export default layout;
