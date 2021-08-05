module.exports = {
    /**
     * 기본 8자리 이상 입력
     * level1: 영어소문자/숫자
     * level2: 영어소문자/숫자/특수문자
     * level3: 영어대문자/소문자/숫자/특수문자
     **/
    password(password, level = 3) {
        let regExp = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[~#?!@$%^&*-]).{8,}$/;
        switch (level) {
            case 1:
                regExp = /^(?=.*?[a-z])(?=.*?[0-9]).{8,}$/;
                break
            case 2:
                regExp = /^(?=.*?[a-z])(?=.*?[0-9])(?=.*?[~#?!@$%^&*-]).{8,}$/;
                break
        }
        return regExp.test(password);
    },
    email(email) {
        let regExp = /^[-A-Za-z0-9_]+[-A-Za-z0-9_.]*[@][-A-Za-z0-9_]+[-A-Za-z0-9_.]*[.][A-Za-z]{1,5}$/g;
        return regExp.test(email);
    },
    phone(phone) {
        let regExp = /(^02.{0}|^01.|[0-9]{3})([0-9]+)([0-9]{4})/g;
        return regExp.test(phone);
    },
    
}