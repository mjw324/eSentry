export type User = {
    id: string;
    email: string | null;
    name: string | null;
    photoUrl: string;
    username?: string;
}

export const DEFAULT_USER: User = {
    photoUrl:"",
    name:"",
    email:"",
    id:""
};