import {useEffect} from 'react';

export default function Login() {
    /*TODO For test purposes - remove later*/
    const callBackendAPI = async () => {
        const response = await fetch('/load-data');
        const body = await response.json();

        if (response.status !== 200) {
            throw Error(body.message)
        }
        return body;
    };

    useEffect(() => {
        callBackendAPI()
            .then(res => console.log(res.express))
            .catch(err => console.log('error:', err));
    }, []);

    return (
        <div>
            Login component
        </div>
    );
}
