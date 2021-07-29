const err = require('http-errors');

const condition = {
    contains(value, array) {
        if (array.filter(item => item === value).length === 0) throw err.BadRequest(`파라미터 처리 오류입니다. (${value})을(를) ${JSON.stringify(array)} 중 하나의 값을 입력해주세요.`);
    },
    custom(condition, message) {
        if (!condition) throw err.BadRequest(message);
    },
    array(value) {
        if (!Array.isArray(value)) throw err.BadRequest(`파라미터 처리 오류입니다. 배열만 입력 가능합니다(${value}).`);
    },
    arrays(value) {
        if (Array.isArray(value)) {
            value.map(item => {
                if (!Array.isArray(item)) throw err.BadRequest(`파라미터 처리 오류입니다. 배열만 입력 가능합니다(${item}).`);
            });
        } else {
            throw err.BadRequest(`파라미터 처리 오류입니다. 배열만 입력 가능합니다(${value}).`);
        }
    },
    number(value, range) {
        if (typeof value !== 'number') throw err.BadRequest(`파라미터 처리 오류입니다. 숫자만 입력 가능합니다(${value}).`);
        if (range.min !== undefined && range.min !== null && range.min > value) throw err.BadRequest(`파라미터 처리 오류입니다. (${value}를 ${range.min} 이상으로 입력해주세요).`);
        if (range.max !== undefined && range.max !== null && range.max < value) throw err.BadRequest(`파라미터 처리 오류입니다. (${value}를 ${range.max} 이하로 입력해주세요).`);
    },
    string(value, range) {
        if (typeof value !== 'string') throw err.BadRequest(`파라미터 처리 오류입니다. 문자열만 입력 가능합니다(${value}).`);
        if (range.min !== undefined && range.min !== null && range.min > value.length) throw err.BadRequest(`파라미터 처리 오류입니다. (${value}를 ${range.min} 이상으로 입력해주세요).`);
        if (range.max !== undefined && range.max !== null && range.max < value.length) throw err.BadRequest(`파라미터 처리 오류입니다. (${value}를 ${range.max} 이하로 입력해주세요).`);
    }
};

const parser = {
    zeroToNull(data, is_strict = false) {
        if (data === null || data === undefined || data === 0) return null;
        else if (data === '0' && !is_strict) return null;
        else return data;
    },
    emptyToNull(data) {
        if (data === null || data === undefined || data === '' || data.toLowerCase() === 'null') return null;
        else return data;
    }
};

const param = function (data, key, option) {
    if (data === null || data === undefined) throw err.BadRequest(`파라미터 처리 오류입니다.`);
    if (Array.isArray(key)) {
        const errors = [];
        key.map(item => { if (data[item] === undefined) errors.push(item); });
        if (errors.length !== 0) throw err.BadRequest(`파라미터 처리 오류입니다. 해당 파라미터를 추가하여 요청해주세요(${JSON.stringify(errors)}).`);
        else return data;
    } else {
        if (data[key] === undefined) {
            if (option === undefined) {
                throw err.BadRequest(`파라미터 처리 오류입니다. 해당 파라미터를 추가하여 요청해주세요(${key}).`);
            } else if (typeof option === 'function') {
                const value = option(data[key]);
                if (value === undefined) throw err.BadRequest(`파라미터 처리 오류입니다. 해당 파라미터를 추가하여 요청해주세요(${key}).`);
                return value;
            } else {
                return option;
            }
        } else {
            if (typeof option === 'function') {
                const value = option(data[key]);
                return value !== undefined ? value : data[key];
            }
        }
        return data[key];
    }
};

const auth = function (data, key, isRequired = true) {
    if (isRequired) {
        if (data === undefined) throw err.Unauthorized(`유효하지 않은 로그인 토큰입니다.`);
        else if (data[key] === undefined) throw err.Unauthorized(`유효하지 않은 로그인 토큰입니다.`);
        return data[key];
    } else {
        if (data === undefined) return null;
        else if (data[key] === undefined) return null;
        return data[key];
    }
};

module.exports = {
    condition,
    parser,
    param,
    auth
};
